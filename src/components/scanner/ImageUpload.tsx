"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";

interface ImageUploadProps {
  onUpload: (dataUrl: string) => void;
}

export function ImageUpload({ onUpload }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) onUpload(e.target.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative cursor-pointer flex flex-col items-center justify-center
        py-12 rounded-lg border-2 border-dashed transition-all
        ${
          isDragging
            ? "border-aegis-cyan bg-aegis-cyan/5"
            : "border-aegis-border hover:border-aegis-cyan/40 hover:bg-aegis-cyan/[0.02]"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div
        className={`p-3 rounded-full mb-3 transition-colors ${
          isDragging ? "bg-aegis-cyan/20 text-aegis-cyan" : "bg-aegis-surface text-aegis-muted"
        }`}
      >
        {isDragging ? <ImageIcon size={28} /> : <Upload size={28} />}
      </div>
      <p className="text-xs font-mono text-aegis-muted tracking-wider">
        {isDragging ? "DROP IMAGE" : "TAP TO UPLOAD OR DRAG IMAGE"}
      </p>
      <p className="text-[10px] font-mono text-aegis-muted/50 mt-1">
        JPEG, PNG — max 10MB
      </p>
    </div>
  );
}
