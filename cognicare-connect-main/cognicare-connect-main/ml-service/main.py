"""Dual-model API: CWT (.keras) at POST /predict, MRI (.h5) at POST /predict/mri — separate files, weights, and endpoints."""
from __future__ import annotations

import io
import logging
import os
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from PIL import Image

logger = logging.getLogger(__name__)


def _api_error_detail(msg: object, limit: int = 280) -> str:
    s = " ".join(str(msg).split())
    if len(s) <= limit:
        return s
    return f"{s[: limit - 1]}…"

# CWT / primary classifier (e.g. best_alzheimers_model.keras)
MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    str(Path(__file__).resolve().parent / "models" / "best_alzheimers_model.keras"),
)
CLASS_LABELS_ENV = os.environ.get("CLASS_LABELS", "")
HF_REPO_ID = os.environ.get("HF_REPO_ID", "")
HF_FILENAME = os.environ.get("HF_FILENAME", "best_alzheimers_model.keras")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

# MRI classifier (SavedModel / HDF5 .h5)
MRI_MODEL_PATH = os.environ.get(
    "MRI_MODEL_PATH",
    str(Path(__file__).resolve().parent / "models" / "MRI.h5"),
)
MRI_CLASS_LABELS_ENV = os.environ.get("MRI_CLASS_LABELS", "")
HF_REPO_ID_MRI = os.environ.get("HF_REPO_ID_MRI", "")
HF_FILENAME_MRI = os.environ.get("HF_FILENAME_MRI", "MRI.h5")

app = FastAPI(title="CogniPredict ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model: Any = None
_model_error: str | None = None
_model_mri: Any = None
_model_mri_error: str | None = None


def _load_one_model(
    path_str: str,
    hf_repo: str,
    hf_filename: str,
    token: str | None,
    missing_hint: str,
) -> tuple[Any | None, str | None]:
    path = Path(path_str)
    if not path.is_file() and hf_repo.strip():
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            downloaded = hf_hub_download(
                repo_id=hf_repo.strip(),
                filename=hf_filename,
                token=token or None,
            )
            path = Path(downloaded)
            logger.info("Downloaded model from Hugging Face: %s/%s", hf_repo, hf_filename)
        except Exception as e:  # noqa: BLE001
            return None, _api_error_detail(
                f"Model download failed from Hugging Face repo '{hf_repo}' file '{hf_filename}': {e}"
            )

    if not path.is_file():
        return None, _api_error_detail(f"Model file not found at {path}. {missing_hint}")

    try:
        import tensorflow as tf

        try:
            tf.config.set_visible_devices([], "GPU")
        except Exception:
            pass
        try:
            m = tf.keras.models.load_model(path, compile=False, safe_mode=False)
        except TypeError:
            m = tf.keras.models.load_model(path, compile=False)
        return m, None
    except Exception as e:  # noqa: BLE001
        logger.exception("Model load failed for %s", path)
        raw = str(e)
        low = raw.lower()
        if (
            "quantization_config" in low
            or "unrecognized keyword" in low
            or "deserializing" in low
            or "separableconv2d" in low
        ):
            raw = (
                "TensorFlow/Keras on the server is older or different than the version used to save this file. "
                "Redeploy with tensorflow>=2.18 in requirements.txt, or re-save the model with the same TF version as production. "
                f"Detail: {raw[:220]}"
            )
        return None, _api_error_detail(raw)


def _load_model() -> None:
    global _model, _model_error
    _model, _model_error = _load_one_model(
        MODEL_PATH,
        HF_REPO_ID,
        HF_FILENAME,
        HF_TOKEN or None,
        "Set HF_REPO_ID/HF_FILENAME or add best_alzheimers_model.keras under ml-service/models/.",
    )


def _load_model_mri() -> None:
    global _model_mri, _model_mri_error
    _model_mri, _model_mri_error = _load_one_model(
        MRI_MODEL_PATH,
        HF_REPO_ID_MRI,
        HF_FILENAME_MRI,
        HF_TOKEN or None,
        "Set HF_REPO_ID_MRI/HF_FILENAME_MRI or add MRI.h5 under ml-service/models/.",
    )


@app.on_event("startup")
def startup() -> None:
    _load_model()
    _load_model_mri()


def _reload_model_if_unloaded() -> None:
    if _model is not None:
        return
    _load_model()


def _reload_mri_if_unloaded() -> None:
    if _model_mri is not None:
        return
    _load_model_mri()


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "CogniPredict ML API",
        "docs": "/docs",
        "health": "GET /health",
        "predict_cwt": "POST /predict (CWT — multipart field: file)",
        "predict_mri": "POST /predict/mri (MRI — multipart field: file)",
    }


def _default_labels(n: int) -> list[str]:
    if n == 1:
        return ["Positive (Alzheimer's risk)"]
    if n == 2:
        return ["No Alzheimer's", "Alzheimer's"]
    if n == 3:
        return ["Cognitive normal", "Frontotemporal dementia", "Alzheimers"]
    return [f"Class {i}" for i in range(n)]


def _labels_for(class_labels_env: str, n: int) -> list[str]:
    if class_labels_env.strip():
        parts = [p.strip() for p in class_labels_env.split(",") if p.strip()]
        if len(parts) == n:
            return parts
    return _default_labels(n)


def _preprocess(img: Image.Image, input_shape: tuple[Any, ...]) -> np.ndarray:
    if len(input_shape) != 4:
        raise ValueError(f"Unexpected input rank: {input_shape}")

    _, h, w, c = input_shape
    h, w, c = int(h), int(w), int(c) if c is not None else 3

    if c == 1:
        img = img.convert("L")
    else:
        img = img.convert("RGB")

    img = img.resize((w, h), Image.Resampling.BILINEAR)
    arr = np.asarray(img, dtype=np.float32)
    if c == 1:
        arr = arr[..., np.newaxis]
    arr = arr / 255.0
    return np.expand_dims(arr, axis=0)


def _decode_probs(vec: np.ndarray, class_labels_env: str) -> tuple[list[dict[str, float]], int, float]:
    v = np.asarray(vec, dtype=np.float64).reshape(-1)

    if v.size == 1:
        p_pos = float(np.clip(v[0], 0.0, 1.0))
        probs = np.array([1.0 - p_pos, p_pos], dtype=np.float64)
        labels = _labels_for(class_labels_env, 2)
        items = [{"label": labels[i], "score": float(probs[i])} for i in range(2)]
        pred_i = int(np.argmax(probs))
        conf = float(np.max(probs))
        return items, pred_i, conf

    if np.any(v < 0) or np.max(v) > 1.5:
        ex = np.exp(v - np.max(v))
        probs = ex / np.sum(ex)
    else:
        s = float(np.sum(v))
        probs = v / s if s > 1e-9 else np.ones_like(v) / len(v)

    n = probs.size
    labels = _labels_for(class_labels_env, n)
    if len(labels) != n:
        labels = _default_labels(n)
    items = [{"label": labels[i], "score": float(probs[i])} for i in range(n)]
    pred_i = int(np.argmax(probs))
    conf = float(probs[pred_i])
    return items, pred_i, conf


def _run_predict(model: Any, raw: bytes, class_labels_env: str) -> dict[str, Any]:
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(raw))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=_api_error_detail(f"Invalid image: {e}")) from e

    inp_shape = model.input_shape
    try:
        batch = _preprocess(img, inp_shape)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=_api_error_detail(e)) from e

    try:
        out = model.predict(batch, verbose=0)
    except Exception as e:  # noqa: BLE001
        logger.exception("Keras predict() failed")
        raise HTTPException(
            status_code=500,
            detail=_api_error_detail(f"Prediction failed: {e}"),
        ) from None

    vec = np.asarray(out[0] if hasattr(out, "__getitem__") else out).reshape(-1)
    probabilities, predicted_index, confidence = _decode_probs(vec, class_labels_env)
    predicted_label = probabilities[predicted_index]["label"]

    return {
        "predicted_label": predicted_label,
        "predicted_class_index": predicted_index,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "input_shape": [int(x) for x in inp_shape if x is not None],
    }


@app.get("/health")
def health() -> dict[str, Any]:
    _reload_model_if_unloaded()
    _reload_mri_if_unloaded()
    return {
        "ok": _model is not None,
        "model_path": MODEL_PATH,
        "error": _model_error,
        "mri": {
            "ok": _model_mri is not None,
            "model_path": MRI_MODEL_PATH,
            "error": _model_mri_error,
        },
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    _reload_model_if_unloaded()
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail=_model_error or "CWT model not loaded.",
        )
    raw = await file.read()
    return _run_predict(_model, raw, CLASS_LABELS_ENV)


@app.post("/predict/mri")
async def predict_mri(file: UploadFile = File(...)) -> dict[str, Any]:
    _reload_mri_if_unloaded()
    if _model_mri is None:
        raise HTTPException(
            status_code=503,
            detail=_model_mri_error or "MRI model not loaded. Add MRI.h5 under ml-service/models/.",
        )
    raw = await file.read()
    return _run_predict(_model_mri, raw, MRI_CLASS_LABELS_ENV)
