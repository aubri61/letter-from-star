"use client";
/* eslint-disable @next/next/no-img-element -- Private signed URLs. */
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Icon, Stamp, CatDrawing } from "./illustrations";
import { Empty } from "./postoffice-ui";
import { formatDate, type Cat, type Letter } from "@/lib/domain";
import { ReplyNowButton } from "./reply-now-button";
export function LetterReader({
  letter,
  cat,
  base,
  onRead,
  onError,
  previous,
  onReply,
  replyHref,
  replyVersions = [],
  providerLabel,
}: {
  letter?: Letter;
  cat: Cat | null;
  base: string;
  onRead: (id: string) => Promise<void>;
  onError: (text: string) => void;
  previous?: Letter;
  onReply?: (id: string) => Promise<void>;
  replyHref?: string;
  replyVersions?: Letter[];
  providerLabel?: string;
}) {
  const readId = useRef<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (
      !letter ||
      letter.direction !== "FROM_CAT" ||
      letter.read_at ||
      readId.current === letter.id
    )
      return;
    readId.current = letter.id;
    void onRead(letter.id).catch(() => {
      readId.current = null;
      onError("읽음 표시를 저장하지 못했어요. 다시 시도해 주세요.");
    });
  }, [letter, onRead, onError, retry]);
  if (!letter)
    return (
      <Empty
        title="편지를 찾지 못했어요"
        text="편지함에서 다른 이야기를 꺼내 볼까요?"
        href={`${base}/archive`}
        label="보관함으로"
      />
    );
  const sourceId =
    letter.direction === "TO_CAT" ? letter.id : letter.reply_to_letter_id;
  return (
    <>
      <Link className="back-link" href={`${base}/archive`}>
        ← 편지 보관함으로
      </Link>
      {replyVersions.length > 0 && (
        <nav className="reply-versions" aria-label="같은 편지에 온 답장">
          <span>같은 편지에 온 답장</span>
          {replyVersions.map((version) => (
            <Link
              key={version.id}
              href={`${base}/letters/${version.id}`}
              aria-current={version.id === letter.id ? "page" : undefined}
            >
              {version.ai_provider === "gemini" ? "Gemini" : "Groq"} 답장
            </Link>
          ))}
        </nav>
      )}
      <article className="reading-paper">
        <div className="paper-address">
          <div className="sender-avatar">
            {cat?.photos.length ? (
              <img
                src={
                  cat.photos.find((p) => p.is_primary)?.url || cat.photos[0].url
                }
                alt={cat.name}
              />
            ) : (
              <CatDrawing />
            )}
            <div>
              <span>
                {letter.direction === "FROM_CAT"
                  ? `FROM. 너의 ${cat?.name || "작은 별"}`
                  : `TO. 나의 ${cat?.name || "작은 별"}`}
              </span>
              <time dateTime={letter.created_at}>
                {formatDate(letter.created_at)}
              </time>
            </div>
          </div>
          <Stamp />
        </div>
        <h1>{letter.title}</h1>
        <div className="letter-body">{letter.content}</div>
        <div className="reading-signature">
          <Icon name="paw" size={20} />
          <span>
            마음을 담아,{" "}
            {letter.direction === "FROM_CAT" ? cat?.name : "너의 집사"}
          </span>
        </div>
        {!letter.read_at && letter.direction === "FROM_CAT" && (
          <button
            className="text-link"
            onClick={() => {
              readId.current = null;
              setRetry((v) => v + 1);
            }}
          >
            읽음 표시 다시 저장하기
          </button>
        )}
      </article>
      <div className="reading-actions">
        {previous ? (
          <Link className="text-link" href={`${base}/letters/${previous.id}`}>
            ← 이전 편지
          </Link>
        ) : (
          <span />
        )}
        <div className="reading-action-group">
          {sourceId && onReply && (
            <ReplyNowButton
              key={letter.id}
              sourceId={sourceId}
              onReply={onReply}
              replyHref={replyHref}
              providerLabel={providerLabel}
            />
          )}
          {(letter.direction === "FROM_CAT" || !onReply) && (
            <Link className="button" href={`${base}/compose`}>
              <Icon name="pen" size={17} />
              {letter.direction === "FROM_CAT" ? "답장 쓰기" : "새 편지 쓰기"}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
