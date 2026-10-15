/** Reads an image file's natural size in the browser (needed for layout-stable rendering). */
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    image.src = url;
  });
}

// --- Optimisation before upload ------------------------------------------------------
//
// Contract (Phase 5): downscale to at most 1600 px wide, re-encode as WebP (~0.85) when that
// is smaller than the original. The decisions are pure functions so they can be tested; the
// canvas work is injected (jsdom has no canvas).

export const MAX_IMAGE_WIDTH = 1600;
export const WEBP_QUALITY = 0.85;
/** Originals above this are refused before decoding, to keep the tab's memory in check. */
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

export interface Size {
  width: number;
  height: number;
}

/** The size to upload at: never wider than `maxWidth`, aspect ratio kept, never upscaled. */
export function targetSize({ width, height }: Size, maxWidth = MAX_IMAGE_WIDTH): Size {
  if (width <= maxWidth) return { width, height };
  return { width: maxWidth, height: Math.max(1, Math.round((height * maxWidth) / width)) };
}

export interface Candidate {
  type: string;
  size: number;
}

/**
 * Which file to upload. A resized original must be replaced (it's too wide); otherwise the
 * re-encoded candidate is used only when it is smaller and still an allowed type.
 */
export function chooseUpload(
  original: Candidate,
  candidate: Candidate | null,
  mustResize: boolean,
  allowedTypes: readonly string[],
): "original" | "candidate" {
  if (!candidate || !allowedTypes.includes(candidate.type)) return "original";
  if (mustResize) return "candidate";
  return candidate.size < original.size ? "candidate" : "original";
}

/** Replaces the extension so the file name matches the (possibly new) type. */
export function renameForType(name: string, type: string): string {
  const extension = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/avif": "avif" }[type];
  if (!extension) return name;
  const base = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${base || "image"}.${extension}`;
}

export interface ImageCodec {
  /** Natural size of the image. */
  measure: (file: File) => Promise<Size>;
  /** Draws the image at `size` and encodes it; resolves null if the browser can't. */
  encode: (file: File, size: Size, type: string, quality: number) => Promise<Blob | null>;
}

const browserCodec: ImageCodec = {
  measure: readImageSize,
  encode: async (file, size, type, quality) => {
    const bitmap = await createImageBitmap(file);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    } finally {
      bitmap.close();
    }
  },
};

export interface OptimisedImage extends Size {
  file: File;
  /** True when the uploaded file differs from what was picked. */
  changed: boolean;
}

/** Downscales and re-encodes an image for the web, keeping the original when that's better. */
export async function optimiseImage(
  file: File,
  allowedTypes: readonly string[],
  codec: ImageCodec = browserCodec,
): Promise<OptimisedImage> {
  const natural = await codec.measure(file);
  const target = targetSize(natural);
  const mustResize = target.width !== natural.width;

  let blob: Blob | null;
  try {
    blob = await codec.encode(file, target, "image/webp", WEBP_QUALITY);
  } catch {
    blob = null; // e.g. an AVIF the browser can display but not draw: keep the original
  }

  const choice = chooseUpload(
    { type: file.type, size: file.size },
    blob ? { type: blob.type, size: blob.size } : null,
    mustResize,
    allowedTypes,
  );
  if (choice === "original" || !blob) return { file, ...natural, changed: false };
  return {
    file: new File([blob], renameForType(file.name, blob.type), { type: blob.type }),
    ...target,
    changed: true,
  };
}
