import type { Photo } from "./domain";
export type UploadPhoto = Photo & { file?: File };
export async function fileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error(
      "사진을 준비하지 못했어요. 다른 브라우저에서 다시 시도해 주세요.",
    );
  }
  ctx.fillStyle = "#fff9ed";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Five photos plus text stay under common serverless request body limits.
  for (const quality of [0.85, 0.7, 0.55, 0.4, 0.25]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= 800_000) {
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
    }
  }
  throw new Error(
    "사진이 너무 복잡하거나 커요. 더 작은 사진으로 다시 선택해 주세요.",
  );
}
