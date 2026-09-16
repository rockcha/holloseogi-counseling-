import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GripHorizontal,
  RotateCcw,
  SmilePlus,
  StickyNote,
  X,
} from "lucide-react";
import { MemberProfileContext } from "./auth-gate";
import { Button } from "./ui/button";
import { IconTooltip } from "./ui/icon-tooltip";
import { supabase } from "@/lib/supabase";

const emojis = [
  "😊",
  "👍",
  "⭐",
  "📌",
  "✅",
  "💡",
  "📞",
  "📚",
  "🎯",
  "❤️",
  "🌱",
  "✨",
];
type Position = { x: number; y: number };
export function FloatingMemo({
  container = null,
  onDirtyChange,
}: {
  container?: HTMLDivElement | null;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const member = useContext(MemberProfileContext);
  const [open, setOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const emojiTrigger = useRef<HTMLButtonElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const selection = useRef({ start: 0, end: 0 });
  const [retry, setRetry] = useState(0);
  const positionKey = `holoseogi-memo-position-${member?.id ?? "demo"}`;
  useEffect(() => {
    if (container) {
      setOpen(false);
      setEmojiOpen(false);
    }
  }, [container]);
  function clamp(p: Position): Position {
    const width =
      panel.current?.offsetWidth ?? Math.min(520, window.innerWidth - 24);
    const height =
      panel.current?.offsetHeight ?? Math.min(600, window.innerHeight - 96);
    return {
      x: Math.max(12, Math.min(p.x, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(p.y, window.innerHeight - height - 12)),
    };
  }
  function remember(p: Position) {
    try {
      localStorage.setItem(positionKey, JSON.stringify(p));
    } catch {
      /* Position is optional. */
    }
  }
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(positionKey) ?? "null");
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y))
        setPosition(clamp(p));
    } catch {
      /* Default bottom-left position. */
    }
  }, [positionKey]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    async function load() {
      try {
        let text = "";
        if (supabase) {
          if (!member) throw new Error("Missing member");
          const { data, error } = await supabase
            .from("personal_memos")
            .select("content")
            .eq("owner_id", member.id)
            .maybeSingle();
          if (error) throw error;
          text = data?.content ?? "";
        } else text = localStorage.getItem("holoseogi-demo-memo") ?? "";
        if (active) {
          setContent(text);
          setSaved(text);
          setMessage("");
        }
      } catch {
        if (active) {
          setFailed(true);
          setMessage(
            "메모를 불러오지 못했습니다. 연결 및 테이블 설정을 확인해 주세요.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [member?.id, retry]);
  useEffect(() => {
    if (!open || container) return;
    const resize = () => setPosition((p) => (p ? clamp(p) : null));
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !launcher.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, container]);
  useEffect(() => {
    if (!emojiOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !panel.current?.querySelector(".memo-emoji-menu")?.contains(target) &&
        !emojiTrigger.current?.contains(target)
      ) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [emojiOpen]);
  const dirty = content !== saved;
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty || loading || failed || saving) return;
    const timer = window.setTimeout(
      () => {
        void save();
      },
      message ? 5000 : open || container ? 600 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [content, saved, loading, failed, saving, open, message, container]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (saveLock.current || loading || failed || content === saved) return;
    saveLock.current = true;
    setSaving(true);
    setMessage("");
    const snapshot = content;
    try {
      if (supabase) {
        if (!member) throw new Error("Missing member");
        const { error } = await supabase
          .from("personal_memos")
          .upsert(
            { owner_id: member.id, content: snapshot },
            { onConflict: "owner_id" },
          );
        if (error) throw error;
      } else localStorage.setItem("holoseogi-demo-memo", snapshot);
      setSaved(snapshot);
      setMessage("");
    } catch {
      setMessage(
        "자동 저장하지 못했습니다. 작성 내용을 유지하고 다시 시도합니다.",
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  function insertEmoji(emoji: string) {
    const start = textarea.current?.selectionStart ?? selection.current.start;
    const end = textarea.current?.selectionEnd ?? selection.current.end;
    const next = content.slice(0, start) + emoji + content.slice(end);
    if (next.length > 5000) return;
    setContent(next);
    setMessage("");
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(
        start + emoji.length,
        start + emoji.length,
      );
    });
  }
  const emojiControls = (
    <div className="memo-toolbar">
      <IconTooltip label="이모지 추가">
        <button
          ref={emojiTrigger}
          type="button"
          className="memo-tool-button"
          aria-label="이모지 추가"
          aria-expanded={emojiOpen}
          disabled={loading || failed}
          onClick={() => setEmojiOpen((value) => !value)}
        >
          <SmilePlus size={18} />
        </button>
      </IconTooltip>
      {emojiOpen && (
        <div className="memo-emoji-menu" role="menu" aria-label="이모지 선택">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              aria-label={`${emoji} 삽입`}
              onClick={() => {
                insertEmoji(emoji);
                setEmojiOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const titlebar = container ? (
    <div className="memo-titlebar memo-titlebar-embedded">
      <StickyNote size={19} aria-hidden="true" />
      <h2>메모장</h2>
      {dirty && (
        <span className="memo-dirty-dot" aria-label="저장되지 않은 변경" />
      )}
      {emojiControls}
    </div>
  ) : (
    <div className="memo-titlebar">
      <button
        className="memo-drag"
        aria-label="메모 이동"
        title="드래그 또는 방향키로 이동"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const box = panel.current!.getBoundingClientRect();
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: box.left,
            top: box.top,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d)
            setPosition(
              clamp({
                x: d.left + e.clientX - d.x,
                y: d.top + e.clientY - d.y,
              }),
            );
        }}
        onPointerUp={(e) => {
          if (drag.current) {
            const box = panel.current!.getBoundingClientRect();
            remember({ x: box.left, y: box.top });
            drag.current = null;
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const delta: Record<string, Position> = {
            ArrowLeft: { x: -20, y: 0 },
            ArrowRight: { x: 20, y: 0 },
            ArrowUp: { x: 0, y: -20 },
            ArrowDown: { x: 0, y: 20 },
          };
          if (delta[e.key]) {
            e.preventDefault();
            const box = panel.current!.getBoundingClientRect();
            const p = clamp({
              x: box.left + delta[e.key].x,
              y: box.top + delta[e.key].y,
            });
            setPosition(p);
            remember(p);
          }
        }}
      >
        <StickyNote size={17} />
        <span>내 메모</span>
        <GripHorizontal size={16} className="ml-auto opacity-50" />
      </button>
      <button
        aria-label="메모 위치 초기화"
        className="memo-icon"
        onClick={() => {
          setPosition(null);
          try {
            localStorage.removeItem(positionKey);
          } catch {
            /* Optional. */
          }
        }}
      >
        <RotateCcw size={14} />
      </button>
      <button
        aria-label="메모 접기"
        className="memo-icon"
        onClick={() => {
          setOpen(false);
          launcher.current?.focus();
        }}
      >
        <X size={17} />
      </button>
      {emojiControls}
    </div>
  );
  return (
    <>
      <IconTooltip label="메모">
        <button
          ref={launcher}
          className="memo-launcher memo-floating-launcher"
          aria-label="내 메모 열기"
          aria-expanded={open}
          aria-controls="personal-memo"
          onClick={() => {
            if (container) textarea.current?.focus();
            else setOpen(!open);
          }}
        >
          <StickyNote size={19} />
          {dirty && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#426083]" />
          )}
        </button>
      </IconTooltip>
      {(open || container) &&
        createPortal(
          <div
            ref={panel}
            id="personal-memo"
            role="region"
            aria-label="내 메모"
            className={container ? "memo-page" : "memo-panel"}
            style={
              !container && position
                ? {
                    left: position.x,
                    top: position.y,
                    right: "auto",
                    bottom: "auto",
                  }
                : undefined
            }
          >
            {titlebar}
            <textarea
              spellCheck={false}
              autoCorrect="off"
              ref={textarea}
              aria-label="메모 내용"
              maxLength={5000}
              disabled={loading || failed}
              value={content}
              onSelect={(e) => {
                selection.current = {
                  start: e.currentTarget.selectionStart,
                  end: e.currentTarget.selectionEnd,
                };
              }}
              onChange={(e) => {
                setContent(e.target.value);
                setMessage("");
              }}
              placeholder={
                loading
                  ? "메모를 불러오는 중…"
                  : "간단하게 메모할 내용을 입력해주세요.."
              }
              className="memo-textarea"
            />
            {message && (
              <p
                role="status"
                className="px-4 pb-2 text-xs leading-5 text-muted-foreground"
              >
                {message}
              </p>
            )}
            {failed && (
              <Button
                variant="outline"
                size="sm"
                className="mx-4 mb-2"
                onClick={() => setRetry((n) => n + 1)}
              >
                다시 불러오기
              </Button>
            )}
            <div className="memo-footer">
              <span className="text-[10px] text-muted-foreground">
                {content.length}/5,000 ·{" "}
                {loading
                  ? "불러오는 중…"
                  : failed
                    ? "불러오기 실패"
                    : message
                      ? "저장 재시도 중…"
                      : saving || dirty
                        ? "자동 저장 중…"
                        : "자동 저장됨"}
              </span>
            </div>
          </div>,
          container ?? document.body,
        )}
    </>
  );
}
