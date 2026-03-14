"use client";
import { useState, useRef } from "react";
import { Icon, Stamp } from "./illustrations";
import { PageHeading } from "./postoffice-ui";
import { validateLetter, type Cat } from "@/lib/domain";
export function Composer({
  cat,
  onSend,
}: {
  cat: Cat;
  onSend: (title: string, content: string, id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const sending = useRef(false);
  return (
    <>
      <PageHeading
        eyebrow="A LETTER TO MY LITTLE STAR"
        title={`${cat.name}에게, 마음을 담아`}
        text="잘 정리된 말이 아니어도 괜찮아요. 오늘의 마음을 천천히 들려주세요."
      />
      <form
        className={`composer-paper ${busy ? "sending" : ""}`}
        onSubmit={async (e) => {
          e.preventDefault();
          if (sending.current) return;
          const invalid = validateLetter(title, content);
          if (invalid) {
            setError(invalid);
            return;
          }
          sending.current = true;
          setBusy(true);
          setError("");
          requestId.current ??= crypto.randomUUID();
          try {
            await onSend(title.trim(), content.trim(), requestId.current);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          } finally {
            sending.current = false;
          }
        }}
      >
        <div className="paper-address">
          <span>TO. 나의 소중한 {cat.name}</span>
          <Stamp />
        </div>
        <label htmlFor="letter-title" className="sr-only">
          편지 제목
        </label>
        <input
          id="letter-title"
          className="letter-title-input"
          maxLength={80}
          required
          placeholder="오늘 편지의 제목을 적어 주세요"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            requestId.current = null;
          }}
          disabled={busy}
        />
        <label htmlFor="letter-content" className="sr-only">
          편지 내용
        </label>
        <textarea
          id="letter-content"
          className="letter-content-input"
          maxLength={3000}
          required
          placeholder={`${cat.name}야, 오늘은 말이야…`}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            requestId.current = null;
          }}
          disabled={busy}
        />
        <div className="composer-bottom">
          <span>FROM. 너를 생각하는 나</span>
          <output aria-label="글자 수">
            {content.length.toLocaleString()} / 3,000
          </output>
        </div>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <div className="composer-submit">
          <p>
            <Icon name="paw" size={15} /> 이 마음은 소중히 간직할게요.
          </p>
          <button className="button" disabled={busy} type="submit">
            <Icon name="mail" size={18} />
            {busy ? "마음을 전하고 있어요…" : "마음 담아 보내기"}
          </button>
        </div>
      </form>
      <p className="form-footnote">
        첫 편지를 보내면 다음 오전 9시부터 매일 한 통의 AI 편지가 찾아와요.
        설정에서 언제든 쉬어 갈 수 있어요.
      </p>
    </>
  );
}
