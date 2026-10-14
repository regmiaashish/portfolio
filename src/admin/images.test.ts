import { describe, expect, it, vi } from "vitest";

import {
  type ImageCodec,
  chooseUpload,
  optimiseImage,
  renameForType,
  targetSize,
} from "./images";
import { ALLOWED_IMAGE_TYPES } from "./validation";

describe("targetSize", () => {
  it("keeps images at or under 1600 px wide", () => {
    expect(targetSize({ width: 1600, height: 900 })).toEqual({ width: 1600, height: 900 });
    expect(targetSize({ width: 800, height: 600 })).toEqual({ width: 800, height: 600 });
  });

  it("scales wide images down to 1600 px, keeping the aspect ratio", () => {
    expect(targetSize({ width: 4000, height: 3000 })).toEqual({ width: 1600, height: 1200 });
    expect(targetSize({ width: 3201, height: 1000 })).toEqual({ width: 1600, height: 500 });
  });

  it("never returns a zero height for extreme panoramas", () => {
    expect(targetSize({ width: 100_000, height: 10 }).height).toBe(1);
  });
});

describe("chooseUpload", () => {
  const original = { type: "image/png", size: 2_000_000 };

  it("uses a smaller WebP", () => {
    expect(chooseUpload(original, { type: "image/webp", size: 400_000 }, false, ALLOWED_IMAGE_TYPES)).toBe(
      "candidate",
    );
  });

  it("keeps an original that is already smaller (e.g. a tight AVIF or WebP)", () => {
    const avif = { type: "image/avif", size: 150_000 };
    expect(chooseUpload(avif, { type: "image/webp", size: 210_000 }, false, ALLOWED_IMAGE_TYPES)).toBe(
      "original",
    );
  });

  it("always uses the resized version when the original is too wide", () => {
    expect(chooseUpload(original, { type: "image/webp", size: 2_500_000 }, true, ALLOWED_IMAGE_TYPES)).toBe(
      "candidate",
    );
  });

  it("keeps the original when the browser couldn't encode, or encoded a type we can't upload", () => {
    expect(chooseUpload(original, null, true, ALLOWED_IMAGE_TYPES)).toBe("original");
    expect(chooseUpload(original, { type: "image/bmp", size: 10 }, false, ALLOWED_IMAGE_TYPES)).toBe(
      "original",
    );
  });
});

describe("renameForType", () => {
  it("matches the extension to the uploaded type", () => {
    expect(renameForType("Screen Shot.PNG", "image/webp")).toBe("Screen Shot.webp");
    expect(renameForType("noext", "image/webp")).toBe("noext.webp");
    expect(renameForType(".png", "image/webp")).toBe("image.webp");
  });
});

describe("optimiseImage", () => {
  function codec(natural: { width: number; height: number }, encoded: Blob | null): ImageCodec {
    return {
      measure: vi.fn(async () => natural),
      encode: vi.fn(async () => encoded),
    };
  }

  const jpeg = new File([new Uint8Array(3_000_000)], "photo.jpg", { type: "image/jpeg" });

  it("downscales and converts a large photo to WebP", async () => {
    const fake = codec({ width: 4000, height: 3000 }, new Blob([new Uint8Array(500_000)], { type: "image/webp" }));

    const result = await optimiseImage(jpeg, ALLOWED_IMAGE_TYPES, fake);

    expect(fake.encode).toHaveBeenCalledWith(jpeg, { width: 1600, height: 1200 }, "image/webp", 0.85);
    expect(result).toMatchObject({ width: 1600, height: 1200, changed: true });
    expect(result.file).toMatchObject({ name: "photo.webp", type: "image/webp", size: 500_000 });
  });

  it("returns the original, with its real size, when re-encoding doesn't help", async () => {
    const fake = codec({ width: 1200, height: 800 }, new Blob([new Uint8Array(3_500_000)], { type: "image/webp" }));

    const result = await optimiseImage(jpeg, ALLOWED_IMAGE_TYPES, fake);

    expect(result).toEqual({ file: jpeg, width: 1200, height: 800, changed: false });
  });

  it("falls back to the original if the browser can't draw the image", async () => {
    const fake: ImageCodec = {
      measure: async () => ({ width: 2000, height: 1000 }),
      encode: async () => {
        throw new Error("decode failed");
      },
    };

    const result = await optimiseImage(jpeg, ALLOWED_IMAGE_TYPES, fake);

    expect(result).toEqual({ file: jpeg, width: 2000, height: 1000, changed: false });
  });
});
