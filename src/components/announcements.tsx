import { PageHeading } from "./ui/page-heading";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Lightbulb,
  MessageCircle,
  Megaphone,
  Plus,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  createAnnouncement,
  matchesTarget,
  targetLabel,
  type Announcement,
  type AnnouncementCategory,
} from "@/lib/announcements";
import {
  createAnnouncementComment,
  fetchAnnouncementComments,
  type AnnouncementComment,
} from "@/lib/announcements";
import type { useAnnouncements } from "./use-announcements";
import { LoadingSkeleton, Skeleton } from "./ui/skeleton";
import { relativeTime } from "@/lib/announcement-notifications";

function listTime(value: string, now: number) {
  if (now - Date.parse(value) < 86_400_000) return relativeTime(value, now);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(value));
}

function AnnouncementSkeleton({ isSuggestion = false }: { isSuggestion?: boolean }) {
  return (
    <LoadingSkeleton
      className="announcement-list"
      label={isSuggestion ? "건의함" : "전달 내용"}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="announcement-row"
          aria-hidden="true"
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {!isSuggestion && <Skeleton className="h-5 w-12 shrink-0" />}
            <div className="flex min-w-0 flex-1 items-center gap-4"><Skeleton className="h-4 w-40 max-w-[75%]" /><Skeleton className="h-3 w-7 shrink-0" /></div>
            <div className="ml-auto flex items-center gap-4"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-20" /></div>
          </div>
        </div>
      ))}
    </LoadingSkeleton>
  );
}

const dateText = (row: Announcement | AnnouncementComment) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(row.created_at));

function AnnouncementDetail({
  announcement,
  actor,
  onBack,
}: {
  announcement: Announcement;
  actor: { id: string; name: string };
  onBack: () => void;
}) {
  const [comments, setComments] = useState<AnnouncementComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAnnouncementComments(announcement.id)
      .then((rows) => {
        if (active) setComments(rows);
      })
      .catch(() => {
        if (active) setError("댓글을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [announcement.id]);
  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !content.trim()) return;
    setSaving(true);
    setError("");
    try {
      const row = await createAnnouncementComment(
        announcement.id,
        content,
        actor,
      );
      setComments((current) => [...current, row]);
      setContent("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "댓글을 등록하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel announcement-detail">
      <div className="border-b p-5 sm:p-7">
        <Button
          type="button"
          variant="ghost"
          className="mb-5 -ml-3"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          {announcement.category === "suggestion" ? "건의함 목록" : "전달 내용 목록"}
        </Button>
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
          {announcement.category !== "suggestion" && (
            <div className="flex items-center gap-2"><dt className="text-muted-foreground">대상</dt><dd
              className={`audience-badge audience-${announcement.building ?? "all"}`}
            >
              {announcement.building === null ? "전체 관" : targetLabel(announcement.building)}
            </dd></div>
          )}
          <div className="flex items-center gap-2"><dt className="text-muted-foreground">작성자</dt><dd className="font-medium">{announcement.author_name}</dd></div>
          <div className="flex items-center gap-2"><dt className="text-muted-foreground">작성일</dt><dd><time dateTime={announcement.created_at}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(new Date(announcement.created_at))}</time></dd></div>
        </dl>
        <PageHeading emoji={announcement.category === 'suggestion' ? '💡' : '📢'} className="mt-6">
          {announcement.title}
        </PageHeading>
      </div>
      <section aria-label="본문" className="border-b p-5 sm:p-7">
        <h2 className="mb-3 text-xs font-medium text-muted-foreground">본문</h2>
        <div className="min-h-64 rounded-xl bg-[#f7f9fc] p-5 sm:p-6 text-sm leading-8 whitespace-pre-wrap break-words">{announcement.content}</div>
      </section>
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2">
          <MessageCircle size={18} className="text-[#426083]" />
          <h2 className="font-bold">댓글</h2>
          <span className="text-sm text-muted-foreground">
            {comments.length}
          </span>
        </div>
        {loading ? (
          <div
            className="space-y-3"
            role="status"
            aria-label="댓글 불러오는 중"
          >
            {[0, 1].map((index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-lg bg-[#edf2f8]"
              />
            ))}
          </div>
        ) : error && !comments.length ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : comments.length ? (
          <div className="space-y-3">
            {comments.map((comment) => (
              <article key={comment.id} className="rounded-lg bg-[#f5f7fa] p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <strong>{comment.author_name}</strong>
                  <time className="text-muted-foreground">
                    {dateText(comment)}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {comment.content}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            첫 댓글을 남겨 보세요.
          </p>
        )}
        <form className="mt-5 border-t pt-5" onSubmit={submitComment}>
          <label className="field">
            댓글 작성
            <textarea
              aria-label="댓글 작성"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="내용을 남겨 주세요."
              disabled={saving}
            />
          </label>
          {error && comments.length > 0 && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={saving || !content.trim()}>
              {saving ? "등록 중…" : "댓글 등록"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function AnnouncementBoard({
  feed,
  building,
  actor,
  selectedId,
  onOpen,
  mode = "announcement",
}: {
  feed: ReturnType<typeof useAnnouncements>;
  building: string;
  actor: { id: string; name: string };
  selectedId: string | null;
  onOpen: (id: string | null) => void;
  mode?: AnnouncementCategory;
}) {
  const isSuggestion = mode === "suggestion";
  const boardTitle = isSuggestion ? "건의함" : "전달 내용";
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const [compose, setCompose] = useState(false);
  const [audience, setAudience] = useState("전체");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [readError, setReadError] = useState("");
  const lock = useRef(false);
  const selected = feed.rows.find((row) => row.id === selectedId);
  const unread =
    selected &&
    ((selected.author_id !== actor.id && !feed.readIds.includes(selected.id)) ||
      feed.notificationRows.some(row => row.postId === selected.id && !feed.readIds.includes(row.id)));
  useEffect(() => {
    setReadError("");
    if (!selectedId || !unread) return;
    let active = true;
    feed.markRead([selectedId]).catch(() => {
      if (active) setReadError("읽음 처리하지 못했습니다.");
    });
    return () => {
      active = false;
    };
  }, [selectedId, unread]);
  const visible = feed.rows.filter((row) => matchesTarget(row, building));
  async function save(form: HTMLFormElement) {
    if (lock.current) return;
    const data = new FormData(form);
    lock.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const row = await createAnnouncement(
        {
          title: String(data.get("title")),
          content: String(data.get("content")),
          building: isSuggestion
            ? null
            : audience === "전체"
              ? null
              : Number(audience),
        },
        actor,
        mode,
      );
      feed.added(row);
      setCompose(false);
      onOpen(row.id);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "등록하지 못했습니다.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  if (selectedId) {
    if (feed.loading) return <section className="panel p-5 sm:p-7"><LoadingSkeleton label={boardTitle}><Skeleton className="h-9 w-24" /><Skeleton className="mt-6 h-7 w-2/3" /><Skeleton className="mt-3 h-4 w-40" /><Skeleton className="mt-8 h-64 w-full" /></LoadingSkeleton></section>;
    return selected ? (
      <AnnouncementDetail
        announcement={selected}
        actor={actor}
        onBack={() => onOpen(null)}
      />
    ) : (
      <section className="panel p-10 text-center" role="status">
        전달 내용을 찾을 수 없습니다.
      </section>
    );
  }
  return (
    <>
      <section className="panel announcement-board">
        <div className="announcement-toolbar">
          <div>
            <PageHeading emoji={isSuggestion ? '💡' : '📢'}>{boardTitle}</PageHeading>
            <p className="mt-1 text-xs text-muted-foreground">
              {isSuggestion
                ? "새로운 기능 제안 혹은 버그 제보를 위한 곳입니다."
                : "선생님들끼리 업무 관련 중요 사항을 공유하는 곳입니다."}
            </p>
          </div>
          <Button
            onClick={() => {
              setAudience(building);
              setSaveError("");
              setCompose(true);
            }}
          >
            <Plus size={16} />
            {isSuggestion ? "건의 작성" : "전달 내용 추가"}
          </Button>
        </div>
        <div
          className="h-[480px] overflow-y-auto overscroll-contain"
          role="region"
          aria-label={`${boardTitle} 목록`}
          tabIndex={0}
        >
          {feed.error ? (
            <div className="p-6">
              <p role="alert" className="text-sm text-destructive">
                {feed.error}
              </p>
              <Button variant="outline" className="mt-3" onClick={feed.refresh}>
                다시 불러오기
              </Button>
            </div>
          ) : feed.loading ? (
            <AnnouncementSkeleton isSuggestion={isSuggestion} />
          ) : (
            <div className="announcement-list">
              {visible.map((row) => {
                return (
                  <button
                    key={row.id}
                    className="announcement-row"
                    onClick={() => onOpen(row.id)}
                  >
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      {!isSuggestion && (
                        <span
                          className={`audience-badge audience-${row.building ?? "all"} shrink-0`}
                        >
                          {targetLabel(row.building)}
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                      <h2 className="min-w-0 text-left text-sm font-bold break-words">
                        {row.title}
                      </h2>
                      <span
                        className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                        aria-label={`댓글 ${row.comment_count ?? 0}개`}
                      >
                        <MessageCircle size={14} />
                        {row.comment_count ?? 0}
                      </span>
                      </div>
                      <span className="ml-auto flex shrink-0 items-center justify-end gap-4 text-muted-foreground">
                        <span className="max-w-24 truncate border-l border-[#e5eaf1] pl-4 text-xs">{row.author_name}</span>
                        <time dateTime={row.created_at} className="min-w-16 whitespace-nowrap text-right text-[11px]">{listTime(row.created_at, now)}</time>
                      </span>
                    </div>
                  </button>
                );
              })}
              {!visible.length && (
                <div className="py-16 px-5 text-center">
                  {isSuggestion ? (
                    <Lightbulb
                      size={28}
                      className="mx-auto mb-4 text-[#9aaabe]"
                    />
                  ) : (
                    <Megaphone
                      size={28}
                      className="mx-auto mb-4 text-[#9aaabe]"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isSuggestion
                      ? "등록된 건의 사항이 없습니다."
                      : "등록된 전달 내용이 없습니다."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      <Dialog
        open={compose}
        onOpenChange={(value) => {
          if (!lock.current) setCompose(value);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSuggestion ? "건의 작성" : "전달 내용 추가"}
            </DialogTitle>
            <DialogDescription>
              {isSuggestion
                ? "새로운 기능 제안이나 버그 내용을 남겨 주세요."
                : "함께 확인할 내용을 남겨 주세요."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void save(event.currentTarget);
            }}
          >
            <fieldset disabled={saving} className="grid gap-5">
              {!isSuggestion && (
                <div className="field">
                  <span>전달 대상</span>
                  <div
                    role="group"
                    aria-label="전달 대상"
                    className="flex gap-2"
                  >
                    {["전체", "1", "2"].map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={audience === value}
                        onClick={() => setAudience(value)}
                        className={`flex-1 rounded-lg border py-2.5 text-sm ${audience === value ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground"}`}
                      >
                        {value === "전체" ? "전체" : `${value}관`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="field">
                제목
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder={
                    isSuggestion ? "제안 또는 버그 제목" : "전달할 내용의 제목"
                  }
                />
              </label>
              <label className="field">
                내용
                <textarea
                  name="content"
                  required
                  maxLength={10000}
                  rows={8}
                  placeholder={
                    isSuggestion
                      ? "제안 내용이나 재현 방법을 입력해 주세요."
                      : "선생님들과 공유할 내용을 입력해 주세요."
                  }
                  className="resize-y leading-7"
                />
              </label>
            </fieldset>
            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setCompose(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "등록 중…" : "등록"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedId) && !compose}
        onOpenChange={(value) => {
          if (!value) onOpen(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.title ?? "전달 내용"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.author_name} 선생님 · ${dateText(selected)}`
                : feed.loading
                  ? "불러오는 중…"
                  : "전달 내용을 찾을 수 없습니다."}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <span
                className={`audience-badge w-fit audience-${selected.building ?? "all"}`}
              >
                {targetLabel(selected.building)}
              </span>
              <div className="border-t pt-5 text-sm leading-8 whitespace-pre-wrap break-words">
                {selected.content}
              </div>
            </>
          )}
          {readError && (
            <div className="flex items-center gap-3">
              <p role="alert" className="text-sm text-destructive">
                {readError}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedId)
                    void feed
                      .markRead([selectedId])
                      .then(() => setReadError(""))
                      .catch(() => setReadError("읽음 처리하지 못했습니다."));
                }}
              >
                다시 시도
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
