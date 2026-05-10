"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/schema";
import { MAX_UPLOAD_BYTES, MODEL_NAME } from "@/lib/schema";

type Status = "idle" | "analyzing" | "done" | "error";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const limitMb = useMemo(
    () => (MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0),
    [],
  );

  function pickFile(f: File | null | undefined) {
    setResult(null);
    setError(null);
    setStatus("idle");
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.type.startsWith("audio/") && !f.name.toLowerCase().endsWith(".mp3")) {
      setError("Please select an MP3 file.");
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(
        `File is ${(f.size / 1024 / 1024).toFixed(2)} MB; limit is ${limitMb} MB.`,
      );
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function analyze() {
    if (!file) return;
    setStatus("analyzing");
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Request failed (${res.status}).`);
      }
      setResult(data as AnalysisResult);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error.");
      setStatus("error");
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError(null);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(2) : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
          <MicIcon className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Audio Authenticity Detector
        </h1>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Upload an MP3. Gemini ({MODEL_NAME}) will assess whether the voice is
          human or AI-generated.
        </p>
      </header>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        {!file ? (
          <Dropzone
            dragOver={dragOver}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => inputRef.current?.click()}
            limitMb={limitMb}
          />
        ) : (
          <FileCard
            name={file.name}
            sizeMb={sizeMb!}
            audioUrl={audioUrl}
            onRemove={reset}
            disabled={status === "analyzing"}
          />
        )}

        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,.mp3"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {file && (
          <button
            onClick={analyze}
            disabled={status === "analyzing"}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            {status === "analyzing" ? (
              <>
                <Spinner /> Analyzing…
              </>
            ) : (
              <>Analyze audio</>
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}
      </section>

      {result && <ResultCard result={result} />}

      <footer className="mt-10 text-center text-xs text-zinc-400 dark:text-zinc-600">
        Heuristic judgment — not a forensic guarantee.
      </footer>
    </main>
  );
}

function Dropzone({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  limitMb,
}: {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  limitMb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
        dragOver
          ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
          : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
      }`}
    >
      <UploadIcon className="mb-3 h-7 w-7 text-zinc-400" />
      <p className="text-sm font-medium">
        Drop an MP3 here, or <span className="text-violet-600 dark:text-violet-400">browse</span>
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Up to {limitMb} MB
      </p>
    </button>
  );
}

function FileCard({
  name,
  sizeMb,
  audioUrl,
  onRemove,
  disabled,
}: {
  name: string;
  sizeMb: string;
  audioUrl: string | null;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={name}>
            {name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {sizeMb} MB
          </p>
        </div>
        <button
          onClick={onRemove}
          disabled={disabled}
          className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline disabled:opacity-50 dark:hover:text-zinc-100"
        >
          Remove
        </button>
      </div>
      {audioUrl && (
        <audio
          controls
          src={audioUrl}
          className="mt-3 w-full"
          preload="metadata"
        />
      )}
    </div>
  );
}

function ResultCard({ result }: { result: AnalysisResult }) {
  const isHuman = result.classification === "Human";
  const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));
  const pct = Math.round(confidence * 100);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className={`px-6 py-5 sm:px-8 ${
          isHuman
            ? "bg-emerald-50 dark:bg-emerald-950/30"
            : "bg-rose-50 dark:bg-rose-950/30"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Verdict
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                isHuman
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300"
              }`}
            >
              Likely {isHuman ? "Human" : "AI-generated"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Confidence
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{pct}%</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              isHuman ? "bg-emerald-500" : "bg-rose-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="space-y-5 px-6 py-5 sm:px-8">
        <div>
          <h3 className="text-sm font-semibold">Rationale</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {result.rationale}
          </p>
        </div>

        {result.indicators?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">Key indicators</h3>
            <ul className="mt-2 space-y-1.5">
              {result.indicators.map((it, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-400" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v5" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <circle cx="12" cy="12" r="9" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
    </svg>
  );
}
