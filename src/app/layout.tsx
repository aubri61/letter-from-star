import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "고별에서 온 편지 · 마음이 닿는 작은 우체국",
  description: "소중한 고양이와의 추억을, 오래도록 따뜻한 편지로 간직하세요.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip" href="#main">
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
