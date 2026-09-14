import { useCallback, useEffect, useRef, useState } from "react";

export function useNavigationGuard() {
  const dirty = useRef(new Set<string>());
  const [leaveOpen, setLeaveOpen] = useState(false);
  const pending = useRef<((value: boolean) => void) | null>(null);
  const index = useRef<number>(window.history.state?.counselingHistoryIndex ?? 0);
  const restoring = useRef<(() => void) | null>(null);
  const setDirty = useCallback((value: boolean) => { if (value) dirty.current.add('journal'); else dirty.current.delete('journal'); }, []);
  const setMemoDirty = useCallback((value: boolean) => { if (value) dirty.current.add('memo'); else dirty.current.delete('memo'); }, []);
  const resolveLeave = useCallback((value: boolean) => {
    if (value) dirty.current.clear();
    pending.current?.(value);
    pending.current = null;
    setLeaveOpen(false);
  }, []);
  const confirmLeave = useCallback((): Promise<boolean> => {
    if (pending.current) return Promise.resolve(false);
    if (!dirty.current.size) return Promise.resolve(true);
    setLeaveOpen(true);
    return new Promise<boolean>(resolve => { pending.current = resolve; });
  }, []);
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, counselingHistoryIndex: index.current }, "");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current.size) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("beforeunload", beforeUnload); pending.current?.(false); };
  }, []);
  async function navigateHistory(path: string, replace = false) {
    if (restoring.current || !await confirmLeave()) return false;
    if (!replace) index.current += 1;
    const state = { ...window.history.state, counselingHistoryIndex: index.current };
    if (replace) window.history.replaceState(state, "", path);
    else window.history.pushState(state, "", path);
    return true;
  }
  const acceptPop = useCallback(async (event: PopStateEvent) => {
    if (restoring.current) {
      const done = restoring.current; restoring.current = null; done(); return false;
    }
    const nextIndex = event.state?.counselingHistoryIndex ?? 0;
    if (dirty.current.size) {
      const delta = index.current - nextIndex;
      if (delta) {
        await new Promise<void>(resolve => { restoring.current = resolve; window.history.go(delta); });
        if (await confirmLeave()) window.history.go(-delta);
        return false;
      }
      if (!await confirmLeave()) return false;
    }
    index.current = nextIndex;
    return true;
  }, [confirmLeave]);
  return { setDirty, setMemoDirty, confirmLeave, navigateHistory, acceptPop, leaveOpen, resolveLeave };
}
