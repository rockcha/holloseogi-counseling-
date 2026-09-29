import { useEffect, useRef, useState } from "react";
import { Popover } from "radix-ui";
import { Check, Palette } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { fetchBackgroundTheme, saveBackgroundTheme } from "@/lib/appearance";

const backgrounds = [
  { id: "default", name: "기본", color: "#f4f6fa" },
  { id: "cream", name: "바닐라", color: "#faf4e5" },
  { id: "peach", name: "피치", color: "#fbece4" },
  { id: "rose", name: "로즈", color: "#f8eaf0" },
  { id: "lavender", name: "라벤더", color: "#efebf8" },
  { id: "sky", name: "스카이", color: "#e8f1fa" },
  { id: "mint", name: "민트", color: "#e8f4ee" },
  { id: "sage", name: "세이지", color: "#edf1e5" },
];

export function useDashboardBackground(memberId?: string) {
  const [choice, setChoice] = useState({ owner: memberId, theme: "default" });
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    let active = true;
    locked.current = false;
    setSaving(false);
    setChoice({ owner: memberId, theme: "default" });
    setLoading(Boolean(supabase && memberId));
    if (supabase && memberId) {
      void fetchBackgroundTheme(memberId)
        .then(theme => {
          if (active) setChoice({ owner: memberId, theme });
        })
        .catch(() => {
          if (active) toast.error("배경색을 불러오지 못했습니다. 다시 선택하거나 새로고침해 주세요.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
      if (generation.current === current) generation.current++;
    };
  }, [memberId]);
  const theme = choice.owner === memberId ? choice.theme : "default";
  const background = backgrounds.find(item => item.id === theme) ?? backgrounds[0];
  async function setBackground(id: string) {
    if (loading || locked.current || !backgrounds.some(item => item.id === id)) return;
    if (supabase && !memberId) return;
    const previous = background.id;
    const current = generation.current;
    setChoice({ owner: memberId, theme: id });
    // The disconnected preview keeps the choice only until the page is reloaded.
    if (!supabase || !memberId) return;
    locked.current = true;
    setSaving(true);
    try {
      await saveBackgroundTheme(memberId, id);
    } catch {
      if (generation.current === current) {
        setChoice({ owner: memberId, theme: previous });
        toast.error("배경색을 저장하지 못했습니다. 다시 선택해 주세요.");
      }
    } finally {
      if (generation.current === current) {
        locked.current = false;
        setSaving(false);
      }
    }
  }
  return { background, setBackground, backgroundBusy: loading || saving || Boolean(supabase && !memberId) };
}

export function DashboardBackgroundPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="상담실 배경색 선택"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#dce3ed] bg-white/80 px-3 py-2 text-xs text-[#62738a] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#426083]"
        >
          <Palette size={15} aria-hidden="true" />
          배경
          <span className="size-3 rounded-full border border-black/10" style={{ backgroundColor: backgrounds.find(item => item.id === value)?.color }} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          aria-label="상담실 배경색"
          className="z-50 w-fit max-w-[calc(100vw-32px)] border bg-white p-3 text-[#17283f] shadow-sm outline-none"
        >
          <h2 className="mb-2 text-xs font-medium text-muted-foreground">배경색</h2>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="배경 색상">
            {backgrounds.map(item => (
              <button
                key={item.id}
                type="button"
                aria-label={item.name}
                title={item.name}
                aria-pressed={value === item.id}
                disabled={disabled}
                onClick={() => onChange(item.id)}
                className="relative flex size-11 items-center justify-center rounded-none hover:z-10 hover:ring-1 hover:ring-inset hover:ring-[#62738a] focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#426083]"
                style={{ backgroundColor: item.color }}
              >
                {value === item.id && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
