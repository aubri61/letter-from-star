export type Photo = {
  id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  url?: string;
};
export type Cat = {
  id: string;
  name: string;
  personality: string;
  favorites: string;
  memories: string;
  photos: Photo[];
};
export type Letter = {
  id: string;
  cat_id: string;
  direction: "TO_CAT" | "FROM_CAT";
  title: string;
  content: string;
  read_at: string | null;
  created_at: string;
  delivery_date: string | null;
  reply_to_letter_id?: string | null;
};
export type PostofficeState = {
  cat: Cat | null;
  letters: Letter[];
  dailyEnabled: boolean;
  userName: string;
  generating: boolean;
  instantReplyEnabled?: boolean;
};
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export function validatePhoto(file: { size: number; type: string }) {
  if (!IMAGE_TYPES.includes(file.type))
    return "JPG, PNG, WebP 사진을 선택해 주세요.";
  if (file.size > MAX_PHOTO_SIZE || file.size === 0)
    return "사진은 한 장당 5MB 이하로 올려 주세요.";
  return null;
}
export function validateLetter(title: string, content: string) {
  if (!title.trim() || title.trim().length > 80)
    return "제목은 1~80자로 적어 주세요.";
  if (!content.trim() || content.trim().length > 3000)
    return "편지는 1~3,000자로 적어 주세요.";
  return null;
}
export function nextDelivery(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
export function unreadLetters(letters: Letter[]) {
  return letters.filter((l) => l.direction === "FROM_CAT" && !l.read_at);
}
export function imageExtension(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
