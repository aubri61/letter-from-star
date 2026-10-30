"use client";
/* eslint-disable @next/next/no-img-element -- Local upload previews. */
import { useState, useRef, useEffect } from "react";
import { Icon } from "./illustrations";
import { PageHeading } from "./postoffice-ui";
import { compress, type UploadPhoto } from "@/lib/photo-client";
import { validatePhoto, type Cat } from "@/lib/domain";
export function CatForm({
  cat,
  onSave,
}: {
  cat: Cat | null;
  onSave: (
    data: {
      name: string;
      personality: string;
      favorites: string;
      memories: string;
    },
    photos: UploadPhoto[],
    primary: number,
  ) => Promise<void>;
}) {
  const [photos, setPhotos] = useState<UploadPhoto[]>(cat?.photos || []),
    [primary, setPrimary] = useState(
      Math.max(0, cat?.photos.findIndex((p) => p.is_primary) ?? 0),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [processing, setProcessing] = useState(false);
  const urls = useRef<string[]>([]);
  const saving = useRef(false);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);
  return (
    <>
      <PageHeading
        eyebrow="TELL ME ABOUT YOUR LITTLE STAR"
        title={cat ? "우리의 소중한 이야기" : "너의 작은 별을 소개해 줘"}
        text="함께한 순간들을 들려주세요. 그 기억을 다정한 편지에 담을게요."
      />
      <form
        className="cat-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving.current || processing) return;
          if (!photos.length) {
            setError("고양이 사진을 한 장 이상 등록해 주세요.");
            return;
          }
          const form = new FormData(e.currentTarget);
          saving.current = true;
          setBusy(true);
          setError("");
          try {
            await onSave(
              {
                name: String(form.get("name")).trim(),
                personality: String(form.get("personality")).trim(),
                favorites: String(form.get("favorites")).trim(),
                memories: String(form.get("memories")).trim(),
              },
              photos,
              primary,
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
            saving.current = false;
          }
        }}
      >
        <fieldset disabled={busy || processing}>
          <legend>
            소중한 사진 <span>1~5장 · JPG, PNG, WebP · 장당 최대 5MB</span>
          </legend>
          <div className="photo-grid">
            {photos.map((photo, index) => (
              <div
                className={`photo-tile ${index === primary ? "primary" : ""}`}
                key={photo.id}
              >
                <img src={photo.url} alt={`고양이 사진 ${index + 1}`} />
                <button
                  className="photo-remove"
                  type="button"
                  aria-label={`사진 ${index + 1} 제거`}
                  onClick={() => {
                    setPhotos((p) => p.filter((_, i) => i !== index));
                    setPrimary((p) =>
                      p === index ? 0 : p > index ? p - 1 : p,
                    );
                  }}
                >
                  <Icon name="close" size={14} />
                </button>
                <button
                  className="photo-primary"
                  type="button"
                  aria-pressed={index === primary}
                  onClick={() => setPrimary(index)}
                >
                  {index === primary ? "✦ 대표 사진" : "대표로 선택"}
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <label className="upload-tile">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  aria-label="고양이 사진 추가"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    if (photos.length + files.length > 5) {
                      setError("사진은 다섯 장까지 등록할 수 있어요.");
                      return;
                    }
                    setProcessing(true);
                    setError("");
                    try {
                      const next: UploadPhoto[] = [];
                      for (const file of files) {
                        const invalid = validatePhoto(file);
                        if (invalid) throw new Error(invalid);
                        const compressed = await compress(file);
                        const url = URL.createObjectURL(compressed);
                        urls.current.push(url);
                        next.push({
                          id: crypto.randomUUID(),
                          storage_path: "",
                          is_primary: false,
                          sort_order: photos.length + next.length,
                          url,
                          file: compressed,
                        });
                      }
                      setPhotos((p) => [...p, ...next]);
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "사진을 읽지 못했어요. 다른 사진을 선택해 주세요.",
                      );
                    } finally {
                      setProcessing(false);
                    }
                  }}
                />
                <span>＋</span>
                <strong>
                  {processing ? "사진 준비 중…" : "사진 추가하기"}
                </strong>
              </label>
            )}
          </div>
          <p className="field-hint">
            사진은 비공개로 보관하며, AI에 전달하지 않아요.
          </p>
        </fieldset>
        <fieldset disabled={busy || processing} className="profile-fields">
          <legend className="sr-only">고양이의 이야기</legend>
          <label>
            고양이 이름 <span>필수</span>
            <input
              name="name"
              required
              maxLength={30}
              defaultValue={cat?.name}
              placeholder="어떤 이름으로 불렀나요?"
            />
          </label>
          <label>
            어떤 성격이었나요?
            <textarea
              name="personality"
              maxLength={500}
              rows={2}
              defaultValue={cat?.personality}
              placeholder="예: 조용하고 느긋하지만, 간식 앞에서는 누구보다 활발했어요."
            />
          </label>
          <label>
            좋아했던 것들
            <textarea
              name="favorites"
              maxLength={500}
              rows={2}
              defaultValue={cat?.favorites}
              placeholder="햇볕 드는 창가, 바스락거리는 봉투…"
            />
          </label>
          <label>
            함께한 소중한 추억
            <textarea
              name="memories"
              maxLength={3000}
              rows={5}
              defaultValue={cat?.memories}
              placeholder="문득 떠오르는 장면을 들려주세요. 사소한 순간이어도 좋아요."
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <div className="form-bottom">
          <span>
            <Icon name="paw" size={16} /> 천천히 적어도 괜찮아요.
          </span>
          <button
            className="button"
            type="submit"
            disabled={busy || processing}
          >
            {busy ? "소중히 간직하는 중…" : "우리의 추억 간직하기"}
            <Icon name="arrow" size={17} />
          </button>
        </div>
      </form>
    </>
  );
}
