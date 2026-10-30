"use client";
/* eslint-disable @next/next/no-img-element -- Private signed photo URLs and local upload previews. */
import type { User, REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatDrawing, Icon, Landscape } from "./illustrations";
import {
  formatDate,
  nextDelivery,
  unreadLetters,
  type Letter,
  type Photo,
  type PostofficeState,
} from "@/lib/domain";
import { subscribeRecovery } from "@/lib/recovery";
import { previewState } from "@/lib/preview";
import { browserSupabase } from "@/lib/supabase/browser";
import { PageHeading, Empty, LetterCard } from "./postoffice-ui";
import { Composer } from "./composer";
import { CatForm } from "./cat-form";
import { LetterReader } from "./letter-reader";
import { fileDataUrl } from "@/lib/photo-client";
const PREVIEW_KEY = "little-star-preview-v1";
async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "잠시 연결이 어려워요.");
  return data;
}
export function Postoffice({
  preview,
  screen,
}: {
  preview: boolean;
  screen: string[];
}) {
  const [state, setState] = useState<PostofficeState | null>(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [tab, setTab] = useState<"FROM_CAT" | "TO_CAT">("FROM_CAT"),
    [more, setMore] = useState(true),
    [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const base = preview ? "/preview" : "/postoffice";
  const page = screen[0] || "home";
  const stateRef = useRef<PostofficeState | null>(null);
  const notify = useCallback((text: string) => setToast(text), []);
  const reload = useCallback(async () => {
    try {
      if (preview) {
        const saved = localStorage.getItem(PREVIEW_KEY);
        const data = saved
          ? (JSON.parse(saved) as PostofficeState)
          : previewState();
        stateRef.current = data;
        setState(data);
      } else {
        const data = (await api("/api/state")) as PostofficeState;
        if (
          stateRef.current &&
          unreadLetters(data.letters).length >
            unreadLetters(stateRef.current.letters).length
        )
          setToast("마음을 담은 새 편지가 도착했어요.");
        stateRef.current = data;
        setState(data);
      }
      setError("");
    } catch {
      setError("우체국에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }, [preview]);
  useEffect(() => {
    void Promise.resolve().then(reload);
    if (preview) {
      const sync = (e: StorageEvent) => {
        if (e.key === PREVIEW_KEY) void reload();
      };
      window.addEventListener("storage", sync);
      return () => window.removeEventListener("storage", sync);
    }
    const db = browserSupabase();
    let active = true;
    let channel: ReturnType<typeof db.channel> | undefined;
    void db.auth
      .getUser()
      .then(({ data: { user } }: { data: { user: User | null } }) => {
        if (!user || !active) return;
        channel = db
          .channel(`letters:${user.id}:${crypto.randomUUID()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "letters",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              void reload();
            },
          )
          .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
            if (status === "SUBSCRIBED") void reload();
          });
      });
    const unsubscribeRecovery = subscribeRecovery(() => void reload());
    return () => {
      active = false;
      if (channel) void db.removeChannel(channel);
      unsubscribeRecovery();
    };
  }, [preview, reload]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  const savePreview = useCallback((next: PostofficeState) => {
    try {
      localStorage.setItem(PREVIEW_KEY, JSON.stringify(next));
      stateRef.current = next;
      setState(next);
    } catch {
      throw new Error(
        "미리보기 저장 공간이 부족해요. 사진 크기를 줄여 주세요.",
      );
    }
  }, []);
  const unread = state ? unreadLetters(state.letters) : [];
  const markRead = useCallback(
    async (id: string) => {
      if (preview) {
        const current = stateRef.current;
        if (current)
          savePreview({
            ...current,
            letters: current.letters.map((l) =>
              l.id === id
                ? { ...l, read_at: l.read_at || new Date().toISOString() }
                : l,
            ),
          });
      } else {
        await api("/api/letters", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        await reload();
      }
    },
    [preview, reload, savePreview],
  );
  useEffect(() => {
    const id = screen[1];
    if (
      preview ||
      page !== "letters" ||
      !id ||
      !state ||
      state.letters.some((l) => l.id === id)
    )
      return;
    let active = true;
    void api(`/api/letters?id=${encodeURIComponent(id)}`)
      .then((data: { letters: Letter[] }) => {
        if (active && stateRef.current) {
          const next = {
            ...stateRef.current,
            letters: [...stateRef.current.letters, ...data.letters],
          };
          stateRef.current = next;
          setState(next);
        }
      })
      .catch(() => {
        if (active) setError("편지를 불러오지 못했어요.");
      });
    return () => {
      active = false;
    };
  }, [page, preview, screen, state]);
  const link = (suffix: string) => base + suffix;
  return (
    <>
      <header className="site-header">
        <Link href={base} className="brand">
          <span className="brand-mark">
            <Icon name="mail" size={23} />
          </span>
          <span>
            고별에서 온 편지<small>LETTERS FROM A LITTLE STAR</small>
          </span>
        </Link>
        <nav aria-label="주 메뉴" className="nav">
          {[
            ["", "home", "우리 우체국"],
            ["/compose", "pen", "편지 쓰기"],
            ["/archive", "archive", "편지 보관함"],
          ].map(([url, icon, label]) => (
            <Link
              key={url}
              href={link(url)}
              aria-current={
                (url === "" ? page === "home" : page === url.slice(1))
                  ? "page"
                  : undefined
              }
            >
              <Icon name={icon as "home" | "pen" | "archive"} size={18} />
              {label}
              {url === "/archive" && unread.length > 0 && (
                <span className="nav-count">{unread.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <Link
          className="account"
          href={link("/settings")}
          aria-label="우체국 설정"
        >
          <Icon name="paw" size={20} />
        </Link>
      </header>
      {preview && (
        <div className="preview-banner">
          <span>
            <strong>개발 미리보기</strong> · 이 브라우저에만 저장되며, 실제
            전송이나 AI 호출은 없어요.
          </span>
          <Link href="/">소개 화면 ↗</Link>
        </div>
      )}
      <main
        id="main"
        className={`app-main ${page === "home" ? "home-main" : ""}`}
      >
        {!state ? (
          <div className="loading-state" role="status">
            <Icon name="mail" size={36} />
            <h1>
              {error
                ? "우체국을 열지 못했어요"
                : "작은 우체국으로 가는 중이에요…"}
            </h1>
            {error && (
              <>
                <p>{error}</p>
                <button className="button" onClick={() => void reload()}>
                  다시 연결하기
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="notice" role="alert">
                {error}
                <button onClick={() => void reload()}>다시 연결</button>
              </div>
            )}
            {page === "home" && (
              <>
                <div className="greeting">
                  <div>
                    <span className="eyebrow">OUR LITTLE POST OFFICE</span>
                    <h1>
                      {state.userName} 집사님, 어서 와요
                      <span className="tiny-spark">✦</span>
                    </h1>
                    <p>
                      오늘도 당신의 마음이 닿는 곳에, 작은 우체국이 열렸어요.
                    </p>
                  </div>
                  <span className="date-chip">
                    <Icon name="sun" size={17} />
                    {formatDate(new Date().toISOString())}
                  </span>
                </div>
                <section className="home-grid">
                  <div className="mailbox-card">
                    <div className="mailbox-heading">
                      <span className="eyebrow">마음을 전하는 우체통</span>
                      <span
                        className={`status-pill ${unread.length ? "new" : ""}`}
                      >
                        <span />
                        {unread.length
                          ? "새 편지가 있어요"
                          : state.generating
                            ? "편지를 준비하고 있어요"
                            : "오늘도 마음을 기다려요"}
                      </span>
                    </div>
                    <div className="mailbox-intro">
                      <h2>
                        {!state.cat
                          ? "우리의 이야기가 시작되는 곳"
                          : unread.length
                            ? `${state.cat.name}에게서 편지가 왔어요`
                            : "너에게 닿을, 오늘의 마음"}
                      </h2>
                      <p>
                        {!state.cat
                          ? "소중한 고양이의 이름과 추억을 들려주세요."
                          : unread.length
                            ? "우체통을 열어, 도착한 작은 안부를 만나 보세요."
                            : "하고 싶은 말은 천천히, 마음이 가는 만큼 적어 주세요."}
                      </p>
                    </div>
                    <Link
                      className="scene-link"
                      href={link(
                        !state.cat
                          ? "/cat"
                          : unread.length
                            ? `/letters/${unread[0].id}`
                            : "/compose",
                      )}
                      aria-label={
                        !state.cat
                          ? "고양이 등록하기"
                          : unread.length
                            ? "새 편지 열어보기"
                            : "고양이에게 편지 쓰기"
                      }
                    >
                      <Landscape arrived={unread.length > 0} />
                      <span className="scene-action">
                        {!state.cat
                          ? "우리 고양이 등록하기"
                          : unread.length
                            ? "편지 열어보기"
                            : "편지 보내러 가기"}
                        <Icon name="arrow" size={16} />
                      </span>
                    </Link>
                  </div>
                  <aside className="cat-card">
                    <div className="cat-card-top">
                      <span className="eyebrow">MY LITTLE STAR</span>
                      <Icon name="star" size={16} />
                    </div>
                    <div className="cat-portrait">
                      {state.cat?.photos.length ? (
                        <img
                          src={
                            state.cat.photos.find((p) => p.is_primary)?.url ||
                            state.cat.photos[0].url
                          }
                          alt={`${state.cat.name}의 대표 사진`}
                        />
                      ) : (
                        <CatDrawing />
                      )}
                    </div>
                    <span className="portrait-caption">
                      {state.cat?.photos.length
                        ? "나의 소중한 작은 별"
                        : preview
                          ? "미리보기 일러스트"
                          : "소중한 사진을 기다려요"}
                    </span>
                    <h2>
                      {state.cat?.name || "나의 작은 별"}
                      <span>에게</span>
                    </h2>
                    <p>
                      {state.cat
                        ? "함께한 모든 순간이, 여전히 반짝여."
                        : "사진 한 장에서 시작되는 우리의 이야기."}
                    </p>
                    <Link className="text-link" href={link("/cat")}>
                      {" "}
                      {state.cat ? "우리의 추억 보기" : "고양이 등록하기"}
                      <Icon name="arrow" size={15} />
                    </Link>
                    <div className="cat-card-bottom">
                      <Icon name="paw" size={16} /> 언제나 마음 한편에, 너
                    </div>
                  </aside>
                </section>
                <div className="delivery-strip">
                  <span className="delivery-icon">
                    <Icon name="mail" size={22} />
                  </span>
                  <div>
                    <strong>
                      {state.dailyEnabled
                        ? `다음 편지는 ${formatDate(nextDelivery().toISOString())} 오전 9시에`
                        : "첫 편지를 보내면, 아침의 안부가 시작돼요"}
                    </strong>
                    <p>
                      {state.dailyEnabled
                        ? "하루 한 통, 추억을 담은 다정한 편지가 찾아와요."
                        : "고양이에게 마음을 전하고 매일 오전 9시의 편지를 받아 보세요."}
                    </p>
                  </div>
                  <Link
                    href={link(state.dailyEnabled ? "/settings" : "/compose")}
                    className="text-link"
                  >
                    {state.dailyEnabled ? "수신 설정" : "마음 전하기"}
                    <Icon name="arrow" size={16} />
                  </Link>
                </div>
                <section className="recent-section">
                  <div className="section-heading">
                    <h2>
                      차곡차곡 쌓이는 마음 <span>최근 편지</span>
                    </h2>
                    <Link href={link("/archive")}>
                      모두 보기 <span>↗</span>
                    </Link>
                  </div>
                  {state.letters.length ? (
                    <div className="recent-grid">
                      {state.letters.slice(0, 3).map((l) => (
                        <LetterCard
                          key={l.id}
                          letter={l}
                          catName={state.cat?.name || ""}
                          base={base}
                        />
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="아직 접어 둔 편지가 없어요"
                      text="첫 편지에 오늘의 작은 이야기를 담아 볼까요?"
                      href={link("/compose")}
                      label="첫 편지 쓰기"
                    />
                  )}
                </section>
              </>
            )}
            {page === "cat" && (
              <CatForm
                cat={state.cat}
                onSave={async (data, photos, primary) => {
                  if (preview) {
                    const converted: Photo[] = await Promise.all(
                      photos.map(async (p, i) => ({
                        id: p.id,
                        storage_path: p.storage_path,
                        is_primary: i === primary,
                        sort_order: i,
                        url: p.file ? await fileDataUrl(p.file) : p.url,
                      })),
                    );
                    savePreview({
                      ...state,
                      cat: {
                        id: state.cat?.id || crypto.randomUUID(),
                        ...data,
                        photos: converted,
                      },
                    });
                  } else {
                    const form = new FormData();
                    Object.entries(data).forEach(([k, v]) => form.set(k, v));
                    form.set(
                      "existing",
                      JSON.stringify(
                        photos.filter((p) => !p.file).map((p) => p.id),
                      ),
                    );
                    photos
                      .filter((p) => p.file)
                      .forEach((p) => form.append("photos", p.file!));
                    form.set("primary", String(primary));
                    await api("/api/cat", { method: "POST", body: form });
                    await reload();
                  }
                  notify("소중한 추억을 잘 간직했어요.");
                  router.push(base);
                }}
              />
            )}
            {page === "compose" &&
              (!state.cat ? (
                <Empty
                  title="먼저, 너의 이야기를 들려줘"
                  text="고양이의 이름과 사진을 등록하면 편지를 보낼 수 있어요."
                  href={link("/cat")}
                  label="고양이 등록하기"
                />
              ) : (
                <Composer
                  cat={state.cat}
                  onSend={async (title, content, requestId) => {
                    if (preview) {
                      if (!state.letters.some((l) => l.id === requestId)) {
                        savePreview({
                          ...state,
                          dailyEnabled: state.letters.some(
                            (l) => l.direction === "TO_CAT",
                          )
                            ? state.dailyEnabled
                            : true,
                          letters: [
                            {
                              id: requestId,
                              cat_id: state.cat!.id,
                              direction: "TO_CAT",
                              title,
                              content,
                              read_at: new Date().toISOString(),
                              created_at: new Date().toISOString(),
                              delivery_date: null,
                            },
                            ...state.letters,
                          ],
                        });
                      }
                    } else {
                      await api("/api/letters", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title, content, requestId }),
                      });
                      await reload();
                    }
                    notify(
                      preview
                        ? "편지를 미리보기 보관함에 담았어요."
                        : "편지가 우체통에 잘 도착했어요.",
                    );
                    router.push(link("/archive"));
                  }}
                />
              ))}
            {page === "archive" && (
              <>
                <PageHeading
                  eyebrow="A BOX FULL OF MEMORIES"
                  title="우리의 편지 보관함"
                  text="언제든 다시 꺼내 볼 수 있도록, 마음을 한 장씩 모아 두었어요."
                />
                <div className="archive-toolbar">
                  <div className="tabs" role="tablist" aria-label="편지 종류">
                    <button
                      role="tab"
                      aria-selected={tab === "FROM_CAT"}
                      aria-controls="letter-list"
                      id="received-tab"
                      onClick={() => setTab("FROM_CAT")}
                    >
                      고양이에게서 온 편지{" "}
                      <span>
                        {
                          state.letters.filter(
                            (l) => l.direction === "FROM_CAT",
                          ).length
                        }
                      </span>
                    </button>
                    <button
                      role="tab"
                      aria-selected={tab === "TO_CAT"}
                      aria-controls="letter-list"
                      id="sent-tab"
                      onClick={() => setTab("TO_CAT")}
                    >
                      고양이에게 보낸 편지{" "}
                      <span>
                        {
                          state.letters.filter((l) => l.direction === "TO_CAT")
                            .length
                        }
                      </span>
                    </button>
                  </div>
                  <span className="archive-count">
                    차곡차곡 모아 둔 우리의 이야기
                  </span>
                </div>
                <div
                  id="letter-list"
                  role="tabpanel"
                  aria-labelledby={
                    tab === "FROM_CAT" ? "received-tab" : "sent-tab"
                  }
                >
                  {state.letters.some((l) => l.direction === tab) ? (
                    <div className="archive-grid">
                      {state.letters
                        .filter((l) => l.direction === tab)
                        .map((l) => (
                          <LetterCard
                            key={l.id}
                            letter={l}
                            catName={state.cat?.name || ""}
                            base={base}
                          />
                        ))}
                    </div>
                  ) : (
                    <Empty
                      title={
                        tab === "FROM_CAT"
                          ? "아직 도착한 편지가 없어요"
                          : "아직 보낸 편지가 없어요"
                      }
                      text={
                        tab === "FROM_CAT"
                          ? "첫 편지를 보내면 다음 오전 9시부터 편지가 찾아와요."
                          : "오늘 문득 떠오른 이야기를 들려주세요."
                      }
                      href={link("/compose")}
                      label="편지 쓰러 가기"
                    />
                  )}
                </div>
                {!preview && state.letters.length >= 50 && more && (
                  <div className="load-more">
                    <button
                      className="button secondary"
                      disabled={loadingMore}
                      onClick={async () => {
                        setLoadingMore(true);
                        try {
                          const result = (await api(
                            `/api/letters?offset=${state.letters.length}`,
                          )) as { letters: Letter[]; hasMore: boolean };
                          const current = stateRef.current;
                          if (current) {
                            const ids = new Set(
                              current.letters.map((l) => l.id),
                            );
                            const next = {
                              ...current,
                              letters: [
                                ...current.letters,
                                ...result.letters.filter((l) => !ids.has(l.id)),
                              ],
                            };
                            stateRef.current = next;
                            setState(next);
                          }
                          setMore(result.hasMore);
                        } catch {
                          notify(
                            "예전 편지를 불러오지 못했어요. 다시 시도해 주세요.",
                          );
                        } finally {
                          setLoadingMore(false);
                        }
                      }}
                    >
                      {loadingMore
                        ? "예전 편지를 꺼내고 있어요…"
                        : "예전 편지 더 보기"}
                    </button>
                  </div>
                )}
              </>
            )}
            {page === "letters" && (
              <LetterReader
                letter={state.letters.find((l) => l.id === screen[1])}
                cat={state.cat}
                base={base}
                onRead={markRead}
                onError={notify}
                previous={state.letters
                  .filter((l) => l.direction === "FROM_CAT")
                  .find((l, i, all) => all[i - 1]?.id === screen[1])}
              />
            )}
            {page === "settings" && (
              <>
                <PageHeading
                  eyebrow="POST OFFICE SETTINGS"
                  title="나의 우체국 설정"
                  text="마음이 편안한 속도로, 우리의 이야기를 이어 가요."
                />
                <section className="settings-paper">
                  <div className="settings-row">
                    <div>
                      <h2>매일 아침의 편지</h2>
                      <p>첫 편지를 보낸 이후, 매일 오전 9시 (한국 시간)</p>
                    </div>
                    <button
                      className={`toggle ${state.dailyEnabled ? "on" : ""}`}
                      role="switch"
                      aria-checked={state.dailyEnabled}
                      aria-label="매일 편지 받기"
                      onClick={async () => {
                        try {
                          if (preview)
                            savePreview({
                              ...state,
                              dailyEnabled: !state.dailyEnabled,
                            });
                          else {
                            await api("/api/preferences", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                enabled: !state.dailyEnabled,
                              }),
                            });
                            await reload();
                          }
                          notify("편지 수신 설정을 저장했어요.");
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      <span />
                    </button>
                  </div>
                  <p className="soft-note">
                    편지는 AI가 남겨 주신 추억을 바탕으로 상상한 글이에요. 실제
                    고양이가 보낸 메시지는 아니에요. 알림은 이 페이지가 열려
                    있을 때 표시돼요.
                  </p>
                  <Link className="button secondary" href={link("/cat")}>
                    고양이와 추억 수정하기
                  </Link>
                  <div className="settings-actions">
                    <button
                      className="text-link danger"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "등록한 고양이와 모든 편지를 삭제할까요? 되돌릴 수 없어요.",
                          )
                        )
                          return;
                        try {
                          if (preview)
                            savePreview({
                              ...state,
                              cat: null,
                              letters: [],
                              dailyEnabled: false,
                            });
                          else {
                            await api("/api/cat", { method: "DELETE" });
                            await reload();
                          }
                          notify("고양이와 편지를 삭제했어요.");
                          router.push(base);
                        } catch (e) {
                          notify((e as Error).message);
                        }
                      }}
                    >
                      고양이와 편지 삭제
                    </button>
                    {preview ? (
                      <button
                        className="text-link"
                        onClick={() => {
                          localStorage.removeItem(PREVIEW_KEY);
                          void reload();
                          notify("미리보기를 처음 모습으로 돌렸어요.");
                        }}
                      >
                        미리보기 초기화
                      </button>
                    ) : (
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            await api("/auth/logout", { method: "POST" });
                            router.push("/");
                            router.refresh();
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        로그아웃
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <Icon name="paw" size={14} /> 기억은 오래, 마음은 가까이.
        </span>
        <span>AI가 추억을 바탕으로 상상한 편지입니다.</span>
      </footer>
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className="toast">
            <Icon name="mail" size={19} />
            <span>{toast}</span>
            <button onClick={() => setToast("")} aria-label="알림 닫기">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
