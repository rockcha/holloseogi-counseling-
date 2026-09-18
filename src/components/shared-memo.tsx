import { useContext, useEffect, useRef, useState } from "react";
import { Megaphone, SmilePlus } from "lucide-react";
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
const SHARED_MEMO_ID = "default";

export function SharedMemo() {
  const member = useContext(MemberProfileContext);
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const emojiTrigger = useRef<HTMLButtonElement>(null);
  const selection = useRef({ start: 0, end: 0 });
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
            .from("shared_memos")
            .select("content")
            .eq("id", SHARED_MEMO_ID)
            .maybeSingle();
          if (error) throw error;
          text = data?.content ?? "";
        } else text = localStorage.getItem("holoseogi-demo-shared-memo") ?? "";
        if (active) {
          setContent(text);
          setSaved(text);
          setMessage("");
        }
      } catch {
        if (active) {
          setFailed(true);
          setMessage(
            "전달 내용을 불러오지 못했습니다. 연결 및 테이블 설정을 확인해 주세요.",
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
  const dirty = content !== saved;
  useEffect(() => {
    if (!dirty || loading || failed || saving) return;
    const timer = window.setTimeout(
      () => {
        void save();
      },
      message ? 5000 : 600,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, saved, loading, failed, saving, message]);
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
          .from("shared_memos")
          .update({ content: snapshot, updated_by_name: member.name })
          .eq("id", SHARED_MEMO_ID);
        if (error) throw error;
      } else localStorage.setItem("holoseogi-demo-shared-memo", snapshot);
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
  return (
    <div ref={panel} className="memo-page shared-memo-page">
      <div className="memo-titlebar memo-titlebar-embedded">
        <Megaphone size={19} aria-hidden="true" />
        <h2>전달 내용</h2>
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
            <div
              className="memo-emoji-menu"
              role="menu"
              aria-label="이모지 선택"
            >
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
      </div>
      <textarea
        spellCheck={false}
        autoCorrect="off"
        ref={textarea}
        aria-label="전달 내용"
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
            ? "전달 내용을 불러오는 중…"
            : "모든 선생님이 함께 보는 전달 내용을 입력해주세요.."
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
    </div>
  );
}
