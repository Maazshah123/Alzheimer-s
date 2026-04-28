import { useEffect, useMemo, useState } from "react";
import { Brain, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";

const normalizeMlBase = (raw: string | undefined): string | undefined => {
  if (!raw?.trim()) return undefined;
  let u = raw.trim().replace(/\/+$/, "");
  for (const suffix of ["/health", "/predict", "/docs", "/openapi.json"]) {
    if (u.toLowerCase().endsWith(suffix.toLowerCase())) u = u.slice(0, -suffix.length).replace(/\/+$/, "");
  }
  return u || undefined;
};

const ML_BASE = normalizeMlBase(import.meta.env.VITE_ML_API_URL as string | undefined);

type ProbRow = { label: string; score: number };

type PredictResponse = {
  predicted_label: string;
  predicted_class_index: number;
  confidence: number;
  probabilities: ProbRow[];
};

const labelTone = (label: string) => {
  const t = label.toLowerCase();
  if (t.includes("cognitive normal") || t === "cn") {
    return {
      bar: "#22c55e",
      badge: "bg-green-100 text-green-800 border-green-200",
    };
  }
  if (t.includes("frontotemporal") || t === "ftd") {
    return {
      bar: "#f59e0b",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }
  if (t.includes("alz")) {
    return {
      bar: "#ef4444",
      badge: "bg-red-100 text-red-800 border-red-200",
    };
  }
  return {
    bar: "#9B51E0",
    badge: "bg-violet-100 text-violet-800 border-violet-200",
  };
};

const MAX_ERR_CHARS = 280;
const clipErr = (s: string) => {
  const t = s.trim();
  return t.length <= MAX_ERR_CHARS ? t : `${t.slice(0, MAX_ERR_CHARS - 1)}…`;
};

async function dataUrlToFile(dataUrl: string, baseName: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const mime = blob.type || "image/png";
  const ext =
    mime.includes("jpeg") || mime.includes("jpg")
      ? "jpg"
      : mime.includes("webp")
        ? "webp"
        : mime.includes("gif")
          ? "gif"
          : "png";
  return new File([blob], `${baseName}.${ext}`, { type: mime });
}

function parsePredictError(status: number, text: string, payload: { detail?: unknown }): string {
  const d = payload.detail;
  if (typeof d === "string" && d.trim()) return clipErr(d);
  if (Array.isArray(d)) {
    const parts = d.map((x: { msg?: string }) => x?.msg).filter(Boolean);
    if (parts.length) return clipErr(parts.join("; "));
  }
  if (text.length > 0 && text.length < 500) {
    try {
      const j = JSON.parse(text) as { message?: string };
      if (typeof j.message === "string") return clipErr(j.message);
    } catch {
      if (!text.startsWith("{")) return clipErr(text);
    }
  }
  if (status === 503) return "The analysis service is not ready (often the model file is missing on the server).";
  if (status === 413) return "Image is too large for the server.";
  if (status === 400) return "This image could not be processed (wrong format or size for the model).";
  return `Request failed (${status}).`;
}

interface Props {
  preselectImageDataUrl?: string | null;
  onConsumedPreselect?: () => void;
}

const DoctorAIAlzheimerPanel = ({ preselectImageDataUrl, onConsumedPreselect }: Props) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  useEffect(() => {
    if (!preselectImageDataUrl?.startsWith("data:image")) return undefined;

    let cancelled = false;
    void (async () => {
      try {
        const f = await dataUrlToFile(preselectImageDataUrl, "appointment-scan");
        if (cancelled) return;
        setFile(f);
        setResult(null);
        toast({
          title: "Image loaded",
          description: "Press Run model to see the result and confidence.",
        });
      } catch {
        if (!cancelled) {
          toast({ title: "Could not load the image", variant: "destructive" });
        }
      } finally {
        if (!cancelled) onConsumedPreselect?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [preselectImageDataUrl, onConsumedPreselect, toast]);

  const runPredict = async () => {
    if (!ML_BASE) {
      toast({
        title: "Analysis URL not set",
        description: "Ask your administrator to configure the analysis service address for this app.",
        variant: "destructive",
      });
      return;
    }
    if (!file) {
      toast({
        title: "Choose an image",
        description: "Upload a brain scan or related image to analyze.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${ML_BASE.replace(/\/$/, "")}/predict`, { method: "POST", body: fd });
      const text = await res.text();
      let payload: PredictResponse & { detail?: unknown } = {} as PredictResponse;
      try {
        if (text) payload = JSON.parse(text) as PredictResponse & { detail?: unknown };
      } catch {
        payload = {} as PredictResponse;
      }

      if (!res.ok) {
        throw new Error(parsePredictError(res.status, text, payload));
      }

      if (!Array.isArray(payload.probabilities)) {
        throw new Error("Unexpected response from analysis service.");
      }

      setResult(payload);
      toast({ title: "Prediction complete", description: `Result: ${payload.predicted_label}` });
    } catch (e: unknown) {
      let msg = e instanceof Error ? e.message : "Something went wrong.";
      if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
        msg =
          "Could not reach the analysis service. If it runs on your computer, keep it running; if the app is on another site, check network access and permissions.";
      }
      toast({
        title: "Prediction failed",
        description: clipErr(msg),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = useMemo(
    () =>
      result?.probabilities.map((p) => ({
        name: p.label.length > 18 ? `${p.label.slice(0, 16)}…` : p.label,
        fullName: p.label,
        score: Math.round(p.score * 1000) / 10,
        color: labelTone(p.label).bar,
      })) ?? [],
    [result],
  );

  return (
    <Card className="rounded-xl border-0 bg-[#F0F2F4] shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 border-b border-gray-200/90 pb-3">
          <Brain className="h-5 w-5 text-[#9B51E0] shrink-0" />
          <CardTitle className="text-gray-900 font-bold border-0 pb-0">AI Alzheimer&apos;s detection</CardTitle>
        </div>
        <CardDescription className="text-gray-500 pt-3">
          Upload a scan image and run the model. You&apos;ll see the predicted class, confidence, and score chart below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-xl">
          <Label htmlFor="ai-file">Image file</Label>
          <Input id="ai-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <Button
          type="button"
          onClick={() => void runPredict()}
          disabled={submitting}
          className="rounded-lg bg-[#9B51E0] hover:bg-[#8540c7] text-white border-0 shadow-sm"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Run model
        </Button>

        {result && (
          <div className="space-y-4 rounded-xl border border-black/[0.06] bg-white/70 p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Model result</p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <p className="text-lg font-semibold text-gray-900">Result:</p>
                  <span
                    className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-semibold ${labelTone(result.predicted_label).badge}`}
                  >
                    {result.predicted_label}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Confidence (this class)</p>
                <p className="text-2xl font-semibold text-[#9B51E0]">{(result.confidence * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Share of probability on the predicted label</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={48} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ""} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {previewUrl && (
              <div className="flex flex-wrap gap-3 items-center">
                <p className="text-xs text-muted-foreground">Preview (input image)</p>
                <img src={previewUrl} alt="Input" className="max-h-40 rounded-lg border object-contain" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DoctorAIAlzheimerPanel;
