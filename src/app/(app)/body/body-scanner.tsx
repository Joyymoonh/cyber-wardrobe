"use client";
import { ScanFigure } from "@/components/art";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, ShieldCheck } from "lucide-react";
import { proportionsFromLandmarks, type ScanResult } from "@/lib/body";

type Landmark = { x: number; y: number; visibility?: number };

// Skeleton edges to draw (MediaPipe pose indices).
const EDGES = [[11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]];

/**
 * Runs MediaPipe Pose fully in the browser. The photo is never uploaded;
 * only the derived ratios are passed to `onResult`.
 */
export function BodyScanner({ onResult }: { onResult: (r: ScanResult) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const landmarkerRef = useRef<unknown>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "analyzing" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);

  useEffect(() => () => {
    (landmarkerRef.current as { close?: () => void } | null)?.close?.();
  }, []);

  async function getLandmarker() {
    if (landmarkerRef.current) return landmarkerRef.current as { detect: (img: HTMLImageElement) => { landmarks: Landmark[][] } };
    setStatus("loading");
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks("/mediapipe");
    const lm = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/pose_landmarker_lite.task", delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 1,
    });
    landmarkerRef.current = lm;
    return lm as unknown as { detect: (img: HTMLImageElement) => { landmarks: Landmark[][] } };
  }

  async function analyze(file?: File) {
    if (!file) return;
    setMessage(null);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      draw(img, null);
      setHasImage(true);
      const lm = await getLandmarker();
      setStatus("analyzing");
      const result = lm.detect(img);
      const pose = result.landmarks[0];
      if (!pose) throw new Error("没有检测到人体，请换一张正面全身照");
      draw(img, pose);
      const ratios = proportionsFromLandmarks(pose, img.naturalWidth / img.naturalHeight);
      if (!ratios) throw new Error("需要能看到头部到脚踝的正面全身照，并尽量站直、手臂微张");
      setStatus("done");
      setMessage(`肩臀比 ${ratios.shoulderHipRatio}，腿身比 ${ratios.legBodyRatio}`);
      onResult(ratios);
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "识别失败");
    } finally {
      URL.revokeObjectURL(url);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function draw(img: HTMLImageElement, pose: Landmark[] | null) {
    const c = canvasRef.current;
    if (!c) return;
    const scale = Math.min(1, 900 / img.naturalHeight);
    c.width = img.naturalWidth * scale;
    c.height = img.naturalHeight * scale;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    if (!pose) return;
    ctx.fillStyle = "rgb(7 7 12 / 0.35)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = Math.max(2, c.width / 160);
    ctx.lineCap = "round";
    const grad = ctx.createLinearGradient(0, 0, 0, c.height);
    grad.addColorStop(0, "#4ff3ff");
    grad.addColorStop(1, "#ff5fc8");
    ctx.strokeStyle = grad;
    ctx.shadowColor = "#9b6bff";
    ctx.shadowBlur = 12;
    for (const [a, b] of EDGES) {
      ctx.beginPath();
      ctx.moveTo(pose[a].x * c.width, pose[a].y * c.height);
      ctx.lineTo(pose[b].x * c.width, pose[b].y * c.height);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      ctx.beginPath();
      ctx.arc(pose[i].x * c.width, pose[i].y * c.height, ctx.lineWidth * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const busy = status === "loading" || status === "analyzing";

  return (
    <div className="space-y-4">
      <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-2xl border border-dashed border-cocoa/15 bg-ink-800">
        <canvas ref={canvasRef} className={hasImage ? "max-h-[70dvh] w-auto max-w-full" : "hidden"} role="img" aria-label="身材扫描结果预览" />
        {!hasImage && (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-sm text-cocoa/75">
            <ScanFigure className="h-48 w-40" />
            上传一张正面全身照（头到脚完整、站直、穿贴身衣物效果更准）
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-paper/90 text-sm">
            <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden />{status === "loading" ? "加载识别模型（首次约 20MB）…" : "正在分析骨架…"}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => analyze(e.target.files?.[0])} tabIndex={-1} aria-hidden />
      <button className="btn-primary w-full" onClick={() => fileRef.current?.click()} disabled={busy}>
        <Camera className="size-4" aria-hidden /> {hasImage ? "换一张照片" : "选择全身照"}
      </button>
      {message && <p role="status" className={status === "error" ? "text-sm text-red-700" : "text-sm text-neon-cyan"}>{message}</p>}
      <p className="flex items-center gap-1.5 text-xs text-cocoa/75">
        <ShieldCheck className="size-3.5" aria-hidden /> 照片只在你的设备上分析，不会上传到服务器
      </p>
    </div>
  );
}
