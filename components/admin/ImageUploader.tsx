"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Upload, X } from "lucide-react";

/** Uploads go through the admin API (sharp-normalised WebP on a data volume). */
export default function ImageUploader({
  images,
  onChange,
  label = "Images",
  help = "First image is the primary. JPEG, PNG, WebP or AVIF up to 12MB.",
}: {
  images: string[];
  onChange: (next: string[]) => void;
  label?: string;
  help?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    const next = [...images];
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body });
        const payload = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !payload.url) {
          setError(payload.error ?? "Upload failed.");
          continue;
        }
        next.push(payload.url);
      }
      onChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label !mb-0">{label}</span>
        <span className="text-[10px] text-muted">{images.length} uploaded</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="group relative aspect-[4/5] overflow-hidden border border-line bg-canvas">
            <Image src={image} alt="" fill sizes="140px" className="object-cover" />
            {index === 0 && (
              <span className="absolute left-1 top-1 bg-ink px-1 py-0.5 text-[8px] uppercase tracking-[0.1em] text-canvas">
                Main
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-0.5 bg-ink/70 p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button type="button" onClick={() => move(index, -1)} className="p-0.5 text-canvas" aria-label="Move earlier">
                <ArrowUp size={11} strokeWidth={2} />
              </button>
              <button type="button" onClick={() => move(index, 1)} className="p-0.5 text-canvas" aria-label="Move later">
                <ArrowDown size={11} strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, i) => i !== index))}
                className="p-0.5 text-canvas"
                aria-label="Remove image"
              >
                <X size={11} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="grid aspect-[4/5] place-items-center border border-dashed border-line text-muted transition-colors hover:border-ink hover:text-ink"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <span className="flex flex-col items-center gap-1">
              <Upload size={15} strokeWidth={1.5} />
              <span className="text-[9.5px] uppercase tracking-[0.1em]">Upload</span>
            </span>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        hidden
        onChange={(event) => void upload(event.target.files)}
      />

      <div className="mt-2 flex gap-2">
        <input
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="…or paste an image URL"
          className="input-boxed !py-1.5 !text-[11.5px]"
        />
        <button
          type="button"
          onClick={() => {
            if (!urlValue.trim()) return;
            onChange([...images, urlValue.trim()]);
            setUrlValue("");
          }}
          className="btn btn-sm btn-outline shrink-0"
        >
          Add
        </button>
      </div>

      {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">{help}</p>
    </div>
  );
}
