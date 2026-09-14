import { useCallback, useEffect, useRef } from "react";

export function useNavigationGuard() {
  const dirty = useRef(false);
  const index = useRef<number>(window.history.state?.counselingHistoryIndex ?? 0);
  const restoring = useRef(false);
  const setDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const confirmLeave = useCallback(() => {
    if (!dirty.current) return true;
    if (!window.confirm("저장하지 않은 상담 내용이 있습니다. 저장하지 않고 이동하시겠습니까?")) return false;
    dirty.current = false;
    return true;
  }, []);

  useEffect(() => {
    window.history.replaceState({ ...window.history.state, counselingHistoryIndex: index.current }, "");
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  function navigateHistory(path: string, replace = false) {
    if (restoring.current || !confirmLeave()) return false;
    if (!replace) index.current += 1;
    const state = { ...window.history.state, counselingHistoryIndex: index.current };
    if (replace) window.history.replaceState(state, "", path);
    else window.history.pushState(state, "", path);
    return true;
  }

  const acceptPop = useCallback((event: PopStateEvent) => {
    if (restoring.current) {
      restoring.current = false;
      return false;
    }
    const nextIndex = event.state?.counselingHistoryIndex ?? 0;
    if (!confirmLeave()) {
      const delta = index.current - nextIndex;
      if (delta) {
        restoring.current = true;
        window.history.go(delta);
      }
      return false;
    }
    index.current = nextIndex;
    return true;
  }, [confirmLeave]);

  return { setDirty, confirmLeave, navigateHistory, acceptPop };
}
