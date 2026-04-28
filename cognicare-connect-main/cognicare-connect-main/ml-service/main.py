"""Alzheimer's image classifier API. Model: ml-service/models/best_alzheimers_model.keras or MODEL_PATH."""
from __future__ import annotations

import io
import logging
import os
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

logger = logging.getLogger(__name__)


def _api_error_detail(msg: object, limit: int = 280) -> str:
    s = " ".join(str(msg).split())
    if len(s) <= limit:
        return s
    return f"{s[: limit - 1]}…"

MODEL_PATH = os.environ.get(
    "MODEL_PATH",
    str(Path(__file__).resolve().parent / "models" / "best_alzheimers_model.keras"),
)
CLASS_LABELS_ENV = os.environ.get("CLASS_LABELS", "")

app = FastAPI(title="CogniPredict ML", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_model_error: str | None = None


def _load_model() -> None:
    global _model, _model_error
    path = Path(MODEL_PATH)
    if not path.is_file():
        _model_error = f"Model file not found at {path}. Copy best_alzheimers_model.keras into ml-service/models/."
        return
    try:
        import tensorflow as tf

        try:
            tf.config.set_visible_devices([], "GPU")
        except Exception:
            pass
        _model = tf.keras.models.load_model(path, compile=False)
        _model_error = None
    except Exception as e:  # noqa: BLE001
        logger.exception("Model load failed")
        _model = None
        raw = str(e)
        low = raw.lower()
        if "quantization_config" in low or "unrecognized keyword" in low:
            raw = (
                "This .keras needs a newer TensorFlow (try: pip install -U 'tensorflow>=2.17'). "
                f"Detail: {raw[:200]}"
            )
        _model_error = _api_error_detail(raw)


@app.on_event("startup")
def startup() -> None:
    _load_model()


def _reload_model_if_unloaded() -> None:
    if _model is not None:
        return
    _load_model()


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "CogniPredict ML API",
        "docs": "/docs",
        "health": "GET /health",
        "predict": "POST /predict (multipart field: file)",
    }


def _default_labels(n: int) -> list[str]:
    if n == 1:
        return ["Positive (Alzheimer's risk)"]
    if n == 2:
        return ["No Alzheimer's", "Alzheimer's"]
    return [f"Class {i}" for i in range(n)]


def _labels_for(n: int) -> list[str]:
    if CLASS_LABELS_ENV.strip():
        parts = [p.strip() for p in CLASS_LABELS_ENV.split(",") if p.strip()]
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


def _decode_probs(vec: np.ndarray) -> tuple[list[dict[str, float]], int, float]:
    v = np.asarray(vec, dtype=np.float64).reshape(-1)

    if v.size == 1:
        p_pos = float(np.clip(v[0], 0.0, 1.0))
        probs = np.array([1.0 - p_pos, p_pos], dtype=np.float64)
        labels = _labels_for(2)
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
    labels = _labels_for(n)
    if len(labels) != n:
        labels = _default_labels(n)
    items = [{"label": labels[i], "score": float(probs[i])} for i in range(n)]
    pred_i = int(np.argmax(probs))
    conf = float(probs[pred_i])
    return items, pred_i, conf


@app.get("/health")
def health() -> dict[str, Any]:
    _reload_model_if_unloaded()
    return {
        "ok": _model is not None,
        "model_path": MODEL_PATH,
        "error": _model_error,
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict[str, Any]:
    _reload_model_if_unloaded()
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail=_model_error or "Model not loaded. Add best_alzheimers_model.keras to ml-service/models/",
        )
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(raw))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=_api_error_detail(f"Invalid image: {e}")) from e

    inp_shape = _model.input_shape
    try:
        batch = _preprocess(img, inp_shape)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=_api_error_detail(e)) from e

    try:
        out = _model.predict(batch, verbose=0)
    except Exception as e:  # noqa: BLE001
        logger.exception("Keras predict() failed")
        raise HTTPException(
            status_code=500,
            detail=_api_error_detail(f"Prediction failed: {e}"),
        ) from None

    vec = np.asarray(out[0] if hasattr(out, "__getitem__") else out).reshape(-1)
    probabilities, predicted_index, confidence = _decode_probs(vec)
    predicted_label = probabilities[predicted_index]["label"]

    return {
        "predicted_label": predicted_label,
        "predicted_class_index": predicted_index,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "input_shape": [int(x) for x in inp_shape if x is not None],
    }
