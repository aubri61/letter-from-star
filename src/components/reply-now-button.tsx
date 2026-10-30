"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "./illustrations";

export function ReplyNowButton({
  sourceId,
  onReply,
  replyHref,
  providerLabel = "Gemini",
}: {
  sourceId: string;
  onReply: (id: string) => Promise<void>;
  replyHref?: string;
  providerLabel?: string;
}) {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (replyHref)
    return (
      <Link className="button secondary" href={replyHref}>
        {providerLabel} 답장 보기
      </Link>
    );
  return (
    <div className="reply-now-control">
      <button
        className="button secondary"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          if (pending.current) return;
          pending.current = true;
          setBusy(true);
          setError("");
          try {
            await onReply(sourceId);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "답장을 받지 못했어요. 다시 시도해 주세요.",
            );
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      >
        <Icon name="mail" size={17} />
        {busy
          ? "고양이가 답장을 쓰고 있어요…"
          : `${providerLabel}로 바로 답장 받기`}
      </button>
      {busy && (
        <span className="reply-now-hint" role="status">
          추억과 편지를 읽고 있어요. 잠시만 기다려 주세요.
        </span>
      )}
      {error && (
        <p className="reply-now-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
