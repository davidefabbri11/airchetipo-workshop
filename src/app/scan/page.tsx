"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Image as ImageIcon, RotateCcw, Trash2, Zap, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { compressImage } from "@/lib/image-compression";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type ScanState = "idle" | "capturing" | "preview" | "uploading";

interface PreviewInfo {
  file: File;
  objectUrl: string;
  originalSize: number;
  compressedSize: number;
  filename: string;
}

const TIPS = [
  {
    num: 1,
    title: "Buona illuminazione",
    desc: "Luce naturale o ambiente ben illuminato per risultati ottimali",
  },
  {
    num: 2,
    title: "Piatto intero",
    desc: "Inquadra l'intero piatto dall'alto, mostrando tutti i componenti",
  },
  {
    num: 3,
    title: "Senza coperchi",
    desc: "Rimuovi coperchi e confezioni per permettere il riconoscimento",
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ScanPage() {
  const router = useRouter();
  const [state, setState] = useState<ScanState>("idle");
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ------- File processing -------

  const processFile = useCallback(async (rawFile: File) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (rawFile.size > MAX_FILE_SIZE) {
      toast.error("Il file supera i 10 MB. Scegli un'immagine più leggera.");
      return;
    }

    try {
      const originalSize = rawFile.size;
      const compressed = await compressImage(rawFile);
      const objectUrl = URL.createObjectURL(compressed);
      const filename = rawFile.name || `foto_${new Date().toISOString().slice(0, 10)}.jpg`;

      setPreview({
        file: compressed,
        objectUrl,
        originalSize,
        compressedSize: compressed.size,
        filename,
      });
      setState("preview");
    } catch {
      toast.error("Errore durante la compressione dell'immagine. Riprova.");
      setState("idle");
    }
  }, []);

  // ------- Actions -------

  const openGallery = () => galleryInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Formato non supportato. Usa JPEG o PNG.");
      return;
    }
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Formato non supportato. Usa JPEG o PNG.");
      return;
    }
    await processFile(file);
  };

  const discard = () => {
    if (preview) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
    setState("idle");
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
    setState("idle");
    // Re-open the camera input after a short delay
    setTimeout(() => openCamera(), 100);
  };

  const uploadAndAnalyze = async () => {
    if (!preview) return;
    setState("uploading");
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 10, 80));
      }, 300);

      const formData = new FormData();
      formData.append("image", preview.file, preview.filename);

      const response = await fetch("/api/meals/analyze", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = (data as { error?: string }).error ?? "Errore durante l'analisi. Riprova.";
        toast.error(msg);
        setUploadProgress(0);
        setState("preview");
        return;
      }

      setUploadProgress(100);
      const data = (await response.json()) as { meal: { id: string } };
      URL.revokeObjectURL(preview.objectUrl);
      setPreview(null);

      router.push(`/analysis/${data.meal.id}`);
    } catch {
      toast.error("Errore imprevisto. Riprova.");
      setState("preview");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0f1d15 0%, #0d1a12 50%, #111a0f 100%)" }}
    >
      {/* Hidden file inputs */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm"
              style={{ color: "#8fa88b" }}
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#f5f2e8" }}>
            Scansiona Pasto
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8fa88b" }}>
            Fotografa o carica un&apos;immagine del tuo piatto per l&apos;analisi nutrizionale AI
          </p>
        </div>

        {/* Main layout: 2 columns */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT — Viewfinder + Actions */}
          <div className="flex flex-col gap-4">
            {/* Viewfinder */}
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "1.25rem",
                background: "#0d1710",
                aspectRatio: "4/3",
                minHeight: "340px",
              }}
            >
              {/* Corner brackets */}
              <CornerBrackets />

              {/* IDLE state */}
              {state === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                  {/* Animated scan line */}
                  <div
                    className="pointer-events-none absolute left-10 right-10 h-0.5"
                    style={{
                      background: "linear-gradient(90deg, transparent, #d4a853, transparent)",
                      animation: "scanLine 3s ease-in-out infinite",
                    }}
                  />
                  <div className="text-5xl" style={{ animation: "float 4s ease-in-out infinite" }}>
                    📷
                  </div>
                  <p className="text-lg font-semibold" style={{ color: "#f5f2e8" }}>
                    Posiziona il piatto nel riquadro
                  </p>
                  <p className="text-sm" style={{ color: "#8fa88b" }}>
                    L&apos;AI analizzerà ogni componente del pasto
                  </p>
                </div>
              )}

              {/* CAPTURING state (simulated — file input handles real camera) */}
              {state === "capturing" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg, #1a2520 0%, #0d1710 50%, #1a2018 100%)" }}
                  />
                  <div className="absolute left-5 top-5 flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: "#e74c3c", animation: "recPulse 1.2s ease-in-out infinite" }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#f5f2e8" }}>
                      Camera attiva
                    </span>
                  </div>
                  <div className="relative z-10 text-8xl" style={{ animation: "plateFloat 5s ease-in-out infinite" }}>
                    🍽️
                  </div>
                </div>
              )}

              {/* PREVIEW state */}
              {state === "preview" && preview && (
                <div className="absolute inset-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.objectUrl}
                    alt="Preview piatto"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {/* Ready badge */}
                  <div
                    className="absolute right-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{
                      background: "rgba(26, 47, 35, 0.85)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#8fa88b",
                    }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
                    Pronta per l&apos;analisi
                  </div>
                  {/* File info bar */}
                  <div
                    className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(15, 29, 21, 0.85)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium" style={{ color: "#f5f2e8" }}>
                        {preview.filename}
                      </span>
                      <span className="text-xs" style={{ color: "#8fa88b" }}>
                        {formatBytes(preview.originalSize)} → {formatBytes(preview.compressedSize)} (compressa)
                      </span>
                    </div>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider"
                      style={{
                        color: "#d4a853",
                        background: "rgba(212,168,83,0.15)",
                        border: "1px solid rgba(212,168,83,0.3)",
                      }}
                    >
                      {preview.file.type === "image/png" ? "PNG" : "JPEG"}
                    </span>
                  </div>
                </div>
              )}

              {/* UPLOADING state */}
              {state === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  {/* Progress ring */}
                  <div className="relative h-28 w-28">
                    <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                      <circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="5"
                      />
                      <circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="#d4a853"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray="339.292"
                        strokeDashoffset={339.292 * (1 - uploadProgress / 100)}
                        style={{ transition: "stroke-dashoffset 0.3s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold" style={{ color: "#f5f2e8" }}>
                        {uploadProgress}%
                      </span>
                      <span className="text-xs uppercase tracking-wider" style={{ color: "#8fa88b" }}>
                        Upload
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold" style={{ color: "#f5f2e8" }}>Caricamento su Supabase Storage</p>
                    <p className="text-sm" style={{ color: "#8fa88b" }}>Compressione e upload in corso...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Capture actions — idle */}
            {state === "idle" && (
              <div className="flex items-center justify-center gap-6">
                {/* Gallery */}
                <button
                  onClick={openGallery}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 transition-colors hover:opacity-80"
                  style={{ color: "#8fa88b" }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(143,168,139,0.15)" }}>
                    <ImageIcon size={22} />
                  </div>
                  <span className="text-xs font-medium">Galleria</span>
                </button>

                {/* Main shutter button */}
                <button
                  onClick={openCamera}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{
                    background: "#f5f2e8",
                    boxShadow: "0 0 0 6px rgba(245,242,232,0.15)",
                  }}
                >
                  <Camera size={28} style={{ color: "#0d1710" }} />
                </button>

                {/* Camera */}
                <button
                  onClick={openCamera}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 transition-colors hover:opacity-80"
                  style={{ color: "#8fa88b" }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(143,168,139,0.15)" }}>
                    <Camera size={22} />
                  </div>
                  <span className="text-xs font-medium">Fotocamera</span>
                </button>
              </div>
            )}

            {/* Capture actions — capturing */}
            {state === "capturing" && (
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={() => setState("idle")}
                  className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3"
                  style={{ color: "#8fa88b" }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(143,168,139,0.15)" }}>
                    <span className="text-lg">✕</span>
                  </div>
                  <span className="text-xs font-medium">Annulla</span>
                </button>
                <button
                  onClick={openCamera}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{ background: "#f5f2e8", boxShadow: "0 0 0 6px rgba(245,242,232,0.15)" }}
                >
                  <Camera size={28} style={{ color: "#0d1710" }} />
                </button>
                <button
                  className="flex flex-col items-center gap-1.5 rounded-xl px-4 py-3"
                  style={{ color: "#8fa88b" }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(143,168,139,0.15)" }}>
                    <RotateCcw size={20} />
                  </div>
                  <span className="text-xs font-medium">Inverti</span>
                </button>
              </div>
            )}

            {/* Preview actions */}
            {state === "preview" && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={discard}
                  className="gap-2 border-white/10 bg-white/5 text-sm hover:bg-white/10"
                  style={{ color: "#f5f2e8" }}
                >
                  <Trash2 size={14} />
                  Scarta
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retake}
                  className="gap-2 border-white/10 bg-white/5 text-sm hover:bg-white/10"
                  style={{ color: "#f5f2e8" }}
                >
                  <Camera size={14} />
                  Riscatta
                </Button>
                <Button
                  size="sm"
                  onClick={uploadAndAnalyze}
                  className="gap-2 text-sm font-semibold"
                  style={{ background: "#d4a853", color: "#0d1710" }}
                >
                  <Activity size={14} />
                  Analizza piatto
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT — Side panel */}
          <div className="flex flex-col gap-4">
            {/* Drag & drop zone */}
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors hover:border-amber-400/40"
              style={{ borderColor: "rgba(212,168,83,0.2)" }}
              onClick={openGallery}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <span className="text-3xl">📥</span>
              <p className="text-sm font-medium" style={{ color: "#f5f2e8" }}>
                Trascina qui la tua foto
              </p>
              <p className="text-xs" style={{ color: "#8fa88b" }}>
                oppure{" "}
                <span className="underline" style={{ color: "#d4a853" }}>
                  sfoglia i file
                </span>{" "}
                dal dispositivo
              </p>
            </div>

            {/* Format info */}
            <Card
              className="border-0"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <CardContent className="p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "#f5f2e8" }}>
                  🖼️ Formati supportati
                </h4>
                {[
                  ["Formati", "JPEG, PNG"],
                  ["Dimensione max", "10 MB"],
                  ["Compressione", "Automatica lato client"],
                  ["Storage", "Supabase (autenticato)"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-t py-2 text-xs" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "#8fa88b" }}>{label}</span>
                    <span
                      style={{ color: label === "Compressione" ? "#d4a853" : "#f5f2e8" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card
              className="border-0"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <CardContent className="p-4">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "#f5f2e8" }}>
                  💡 Consigli per la foto
                </h4>
                <div className="flex flex-col">
                  {TIPS.map((tip, i) => (
                    <div
                      key={tip.num}
                      className={`flex gap-3 py-3 ${i > 0 ? "border-t" : ""}`}
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: "rgba(143,168,139,0.2)", color: "#8fa88b" }}
                      >
                        {tip.num}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#8fa88b" }}>
                        <strong style={{ color: "#f5f2e8" }}>{tip.title}</strong> — {tip.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compression info */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "linear-gradient(135deg, #1a3322, #0d2418)" }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Zap size={16} style={{ color: "#d4a853" }} />
                <span className="text-sm font-semibold" style={{ color: "#f5f2e8" }}>
                  Compressione intelligente
                </span>
              </div>
              <p className="mb-4 text-xs leading-relaxed" style={{ color: "#8fa88b" }}>
                Le immagini vengono automaticamente ridimensionate e compresse lato client
                prima dell&apos;upload, mantenendo la qualità necessaria per l&apos;analisi AI.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#e07070" }}>5.2 MB</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: "35%",
                      background: "linear-gradient(90deg, #d4a853, #f0c87a)",
                    }}
                  />
                </div>
                <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "#d4a853" }}>1.8 MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes scanLine {
          0% { top: 15%; opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { top: 85%; opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes recPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes plateFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-6px) scale(1.02); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Corner brackets component
// ---------------------------------------------------------------------------

function CornerBrackets() {
  const style: React.CSSProperties = {
    background: "#d4a853",
    borderRadius: "2px",
    position: "absolute",
  };

  return (
    <div className="pointer-events-none absolute inset-10">
      {/* TL */}
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <div style={{ ...style, top: 0, left: 0, width: 32, height: 3 }} />
        <div style={{ ...style, top: 0, left: 0, width: 3, height: 32 }} />
      </div>
      {/* TR */}
      <div style={{ position: "absolute", top: 0, right: 0 }}>
        <div style={{ ...style, top: 0, right: 0, width: 32, height: 3 }} />
        <div style={{ ...style, top: 0, right: 0, width: 3, height: 32 }} />
      </div>
      {/* BL */}
      <div style={{ position: "absolute", bottom: 0, left: 0 }}>
        <div style={{ ...style, bottom: 0, left: 0, width: 32, height: 3 }} />
        <div style={{ ...style, bottom: 0, left: 0, width: 3, height: 32 }} />
      </div>
      {/* BR */}
      <div style={{ position: "absolute", bottom: 0, right: 0 }}>
        <div style={{ ...style, bottom: 0, right: 0, width: 32, height: 3 }} />
        <div style={{ ...style, bottom: 0, right: 0, width: 3, height: 32 }} />
      </div>
    </div>
  );
}
