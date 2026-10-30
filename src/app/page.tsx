import Link from "next/link";
import { redirect } from "next/navigation";
import { oauthReturnPath } from "@/lib/oauth-return";
import { Icon, Landscape, Stamp } from "@/components/illustrations";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    code?: string | string[];
    error?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const callback = oauthReturnPath(params);
  if (callback) redirect(callback);
  const { notice } = params;
  const preview =
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEV_PREVIEW === "true";
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Icon name="mail" size={23} />
          </span>
          <span>
            고별에서 온 편지<small>LETTERS FROM A LITTLE STAR</small>
          </span>
        </Link>
        <span className="header-note">그리운 마음이, 편지가 되는 곳</span>
      </header>
      <main id="main" className="landing">
        <div className="landing-copy">
          <span className="eyebrow">
            <span /> 마음과 마음 사이, 작은 우체국
          </span>
          <h1>
            멀리 있어도,
            <br />
            마음은 늘 <em>네 곁에.</em>
          </h1>
          <p>
            언제나, 그 자리에서 너를 생각하는 마음으로.
            <br />
            소중한 너와의 이야기를 편지로 이어 가요.
          </p>
          <a className="button google" href="/auth/login">
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285f4"
                d="M22 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.6a4.8 4.8 0 0 1-2.1 3.2v2.7H19c2-1.8 3-4.5 3-7.9"
              />
              <path
                fill="#34a853"
                d="M12 22c2.8 0 5.2-.9 7-2.6l-3.5-2.7c-.9.6-2.1.9-3.5.9-2.7 0-5-1.8-5.8-4.2H2.6v2.8A10 10 0 0 0 12 22"
              />
              <path
                fill="#fbbc05"
                d="M6.2 13.4a6 6 0 0 1 0-3.8V6.8H2.6a10 10 0 0 0 0 8.4Z"
              />
              <path
                fill="#ea4335"
                d="M12 6.4c1.5 0 2.8.5 3.8 1.5L19 4.8A10 10 0 0 0 2.6 6.8l3.6 2.8A6.1 6.1 0 0 1 12 6.4"
              />
            </svg>
            Google로 마음 잇기
            <Icon name="arrow" size={18} />
          </a>
          {preview && (
            <Link className="preview-link" href="/preview">
              작은 우체국 미리 둘러보기 <span>↗</span>
            </Link>
          )}
          {notice && (
            <p role="alert" className="notice">
              {notice === "setup"
                ? "Google 로그인을 열려면 Supabase 연결 설정이 필요해요."
                : "로그인을 마치지 못했어요. 잠시 후 다시 시도해 주세요."}
            </p>
          )}
          <div className="landing-footnote">
            <Icon name="paw" size={17} /> 고별 우체국에서, 너에게 보내는 작은
            안부.
          </div>
        </div>
        <div className="landing-postcard">
          <div className="postcard-top">
            <span>TO. 언제나 소중한 너에게</span>
            <Stamp />
          </div>
          <Landscape arrived />
          <div className="postcard-bottom">
            <span>거리는 멀어져도, 우리의 이야기는 계속되니까.</span>
            <span className="postmark">
              고별 우체국
              <br />
              마음을 담아
            </span>
          </div>
        </div>
        <section className="landing-steps" aria-label="이용 안내">
          {[
            [
              "01",
              "너의 이야기를 들려줘",
              "사진과 함께, 소중한 추억을 담아 주세요.",
            ],
            [
              "02",
              "마음을 편지에 담아",
              "오늘 문득 떠오른 이야기를 보내 보세요.",
            ],
            [
              "03",
              "아침에 만나는 작은 안부",
              "첫 편지 다음 오전 9시부터 마음을 전해요.",
            ],
          ].map(([num, title, body]) => (
            <article key={num}>
              <span>{num}</span>
              <div>
                <h2>{title}</h2>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="site-footer">
        <span>고별에서 온 편지</span>
        <span>기억은 오래, 마음은 가까이.</span>
      </footer>
    </>
  );
}
