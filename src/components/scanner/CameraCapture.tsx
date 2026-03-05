"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, SwitchCamera, X } from "lucide-react";
import { GlowButton } from "@/components/ui/GlowButton";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setError(null);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-aegis-muted">
        <Camera size={32} className="mb-3 opacity-40" />
        <p className="text-xs font-mono text-center px-4">{error}</p>
        <GlowButton onClick={startCamera} className="mt-4">
          RETRY
        </GlowButton>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <GlowButton onClick={startCamera}>
          <Camera size={16} />
          ACTIVATE CAMERA
        </GlowButton>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-lg"
      />

      {/* HUD overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Corners */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-aegis-cyan/70" />
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-aegis-cyan/70" />
        <div className="absolute bottom-16 left-4 w-12 h-12 border-b-2 border-l-2 border-aegis-cyan/70" />
        <div className="absolute bottom-16 right-4 w-12 h-12 border-b-2 border-r-2 border-aegis-cyan/70" />

        {/* Center reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-20 h-14 border-2 border-aegis-cyan/50 rounded-sm animate-pulse-glow" />
        </div>

        {/* Scan line */}
        <div className="absolute inset-x-0 h-full overflow-hidden">
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-aegis-cyan/60 to-transparent animate-scan-line" />
        </div>

        {/* Status bar */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <span className="text-[9px] font-mono text-aegis-cyan/80 tracking-[0.2em] bg-aegis-bg/50 px-2 py-0.5 rounded">
            LIVE FEED — TARGETING
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4">
        <button
          onClick={stopCamera}
          className="p-2 rounded-full bg-aegis-bg/70 border border-aegis-border text-aegis-muted hover:text-aegis-text transition-colors"
        >
          <X size={18} />
        </button>
        <button
          onClick={capture}
          className="w-14 h-14 rounded-full border-[3px] border-aegis-cyan flex items-center justify-center bg-aegis-cyan/10 hover:bg-aegis-cyan/20 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-aegis-cyan/30" />
        </button>
        <button
          onClick={() =>
            setFacingMode((f) => (f === "environment" ? "user" : "environment"))
          }
          className="p-2 rounded-full bg-aegis-bg/70 border border-aegis-border text-aegis-muted hover:text-aegis-text transition-colors"
        >
          <SwitchCamera size={18} />
        </button>
      </div>
    </div>
  );
}
