export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export async function compressImage(
  file: File,
  {
    maxSizes,
    quality,
    maxChars,
    errorLabel,
  }: { maxSizes: number[]; quality: number; maxChars: number; errorLabel: string }
): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("The image must be smaller than 10 MB.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (image.naturalWidth > 12000 || image.naturalHeight > 12000) {
      throw new Error(`This image is too large to process. Choose a smaller ${errorLabel}.`);
    }

    // Keep original asset untouched if it already fits size & dimension limits
    if (Math.max(image.naturalWidth, image.naturalHeight) <= maxSizes[0]) {
      const originalDataUrl = await readFileAsDataUrl(file);
      if (originalDataUrl && originalDataUrl.length <= maxChars) {
        return originalDataUrl;
      }
    }

    const qualitySteps = Array.from(new Set([quality, Math.min(quality, 0.72), 0.6, 0.48])).sort(
      (a, b) => b - a
    );
    for (const maxSize of maxSizes) {
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const q of qualitySteps) {
        const webpUrl = canvas.toDataURL("image/webp", q);
        if (webpUrl.startsWith("data:image/webp") && webpUrl.length <= maxChars) {
          return webpUrl;
        }
        // Safari falls back to uncompressed image/png for image/webp; encode lossy JPEG instead
        const jpegUrl = canvas.toDataURL("image/jpeg", q);
        if (jpegUrl.length <= maxChars) {
          return jpegUrl;
        }
      }
    }
    throw new Error(
      `This ${errorLabel} could not be compressed under ${Math.round(maxChars / 1370)} KB. Use a simpler PNG, JPG, or WebP file (< 10 MB).`
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
