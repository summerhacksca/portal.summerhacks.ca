"use client";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** Matches allowed_mime_types on the scavenger-hunt bucket (migrations/0009). */
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

export type PreparedPhoto = {
  blob: Blob;
  contentType: string;
  /** Requested file extension. The server validates it before building a path. */
  extension: string;
};

/**
 * Shrink a camera photo to something a cafe LTE connection can actually push.
 * A 4 MB phone shot comes out around 300 KB.
 *
 * Going through a canvas also bakes in the EXIF rotation, so a photo taken
 * sideways isn't stored sideways, and drops every other EXIF tag along with it
 * - including GPS, which a scavenger hunt has no business keeping.
 *
 * Falls back to the original bytes if the browser can't decode the file:
 * desktop Chrome can't read an iPhone HEIC, and a large upload beats a failed
 * one. The bucket accepts HEIC for exactly that case.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const original: PreparedPhoto = {
    blob: file,
    contentType: file.type || "image/jpeg",
    extension: EXTENSION_BY_TYPE[file.type] ?? "jpg",
  };

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return original;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });

    if (!blob) return original;

    return { blob, contentType: "image/jpeg", extension: "jpg" };
  } catch {
    return original;
  }
}
