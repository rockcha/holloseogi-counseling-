import { useContext, useEffect, useRef, useState } from "react";
import { useNavigationGuard } from "@/lib/use-navigation-guard";
import {
  Bell,
  ClipboardList,
  ListTodo,
  Megaphone,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  StickyNote,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sprout,
  Users,
  X,
  ArrowUpRight,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadCounsels, localDate, type Counsel } from "./data";

import { MemberProfileContext } from "@/components/auth-gate";
import { CounselingManagement } from "@/components/counseling-management";
import { ActivityLogs } from "@/components/activity-logs";
import { AnnouncementBoard } from "@/components/announcements";
import { useAnnouncements } from "@/components/use-announcements";
import { matchesTarget, targetLabel } from "@/lib/announcements";
import { Dashboard } from "@/components/dashboard";
import { StudentManagement } from "@/components/student-management";
import { FloatingMemo } from "@/components/floating-memo";
import { PersonalTodos } from "@/components/personal-todos";
import { WeatherDialog } from "@/components/weather-dialog";
import { BrandLogo } from "@/components/brand-logo";
import { SidebarGroup } from "@/components/sidebar-group";
import { IconTooltip } from "@/components/ui/icon-tooltip";
import { PageHeading } from "@/components/ui/page-heading";
import { supabase } from "@/lib/supabase";
import { fetchCounsels, persistCounsel } from "@/lib/counsels";
import { Toaster, toast } from "sonner";
import {
  relativeTime,
  type AnnouncementNotification,
} from "@/lib/announcement-notifications";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const pages = [
  { name: "대시보드", icon: LayoutDashboard },
  { name: "학생 관리", icon: Users },
  { name: "상담 관리", icon: MessageSquare },
];
const pageHints: Record<string, string> = {
  대시보드: "학생들의 상담 현황을 체크할 수 있습니다.",
  "학생 관리": "학생 정보를 등록하고 관리할 수 있습니다.",
  "상담 관리": "학생들의 상담 리스트와 상담일지를 관리할 수 있습니다.",
  시간표: "준비중",
  메모장: "나만의 메모를 넓게 작성할 수 있습니다.",
  "할 일": "나만의 할 일을 정리하고 완료한 항목을 체크합니다.",
  "활동 로그": "선생님들의 활동 기록을 확인할 수 있습니다.",
  "전달 내용": "선생님들끼리 업무 관련 중요 사항을 공유하는 곳입니다.",
  건의함: "새로운 기능 제안 혹은 버그 제보를 위한 곳입니다.",
  "환경 설정": "서비스 환경과 개인 설정을 관리할 수 있습니다.",
  "이용 안내": "서비스 이용 방법과 주요 기능을 확인할 수 있습니다.",
};
export default function App() {
  const [todoContainer, setTodoContainer] = useState<HTMLDivElement | null>(null);
  const { setDirty: setJournalDirty, confirmLeave, navigateHistory, acceptPop } = useNavigationGuard();
  const [memoContainer, setMemoContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const [records, setRecords] = useState<Counsel[]>(() =>
    supabase ? [] : loadCounsels(),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(Boolean(supabase));
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [path, setPath] = useState(window.location.pathname);
  const [page, setPage] = useState(
    window.location.pathname.startsWith("/community/announcements")
      ? "전달 내용"
      : window.location.pathname.startsWith("/community/suggestions")
        ? "건의함"
        : window.location.pathname.startsWith("/counseling")
          ? "상담 관리"
          : window.location.pathname === "/timetable"
            ? "시간표"
            : window.location.pathname === "/todos"
              ? "할 일"
            : window.location.pathname === "/memo"
              ? "메모장"
              : "대시보드",
  );
  const studentId =
    path.match(
      /^\/counseling\/students\/([^/]+)(?:\/new|\/journals\/[^/]+)?\/?$/,
    )?.[1] ?? null;
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (!acceptPop(event)) return;
      setPath(window.location.pathname);
      setPage(
        window.location.pathname.startsWith("/community/announcements")
          ? "전달 내용"
          : window.location.pathname.startsWith("/community/suggestions")
            ? "건의함"
            : window.location.pathname.startsWith("/counseling")
              ? "상담 관리"
              : window.location.pathname === "/timetable"
                ? "시간표"
                : window.location.pathname === "/todos"
                  ? "할 일"
                : window.location.pathname === "/memo"
                  ? "메모장"
                  : "대시보드",
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [acceptPop]);
  function navigateCounseling(next: string, replace = false) {
    if (!navigateHistory(next, replace)) return;
    setPath(next);
    setPage("상담 관리");
    setMobile(false);
  }
  const [building, setBuilding] = useState(() => {
    try {
      const saved = localStorage.getItem("holoseogi-building");
      return saved === "1" || saved === "2" ? saved : "전체";
    } catch {
      return "전체";
    }
  });
  function changeBuilding(value: string) {
    if (!confirmLeave()) return;
    setBuilding(value);
    try {
      localStorage.setItem("holoseogi-building", value);
    } catch {}
    if (studentId) navigateCounseling("/counseling");
  }
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("전체");
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [reading, setReading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [profile, setProfile] = useState(false);
  const headerMenus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profile && !notifications) return;
    const outside = (event: PointerEvent) => {
      if (!headerMenus.current?.contains(event.target as Node)) {
        setProfile(false);
        setNotifications(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfile(false);
        setNotifications(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [profile, notifications]);
  const [dialog, setDialog] = useState(false);
  const [selected, setSelected] = useState<Counsel | null>(null);
  const [day, setDay] = useState(localDate());
  const member = useContext(MemberProfileContext);
  const actor = {
    id: member?.id ?? "local-teacher",
    name: member?.name ?? "홀로서기",
  };
  const feed = useAnnouncements(actor.id);
  const suggestionFeed = useAnnouncements(actor.id, "suggestion");
  const [notificationNow, setNotificationNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(
      () => setNotificationNow(Date.now()),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const notificationRows = feed.notificationRows.filter(
    (row) => row.author_id !== actor.id && matchesTarget(row, building),
  );
  const unreadIds = notificationRows
    .filter((row) => !feed.readIds.includes(row.id))
    .map((row) => row.id);
  const selectedAnnouncement =
    path.match(/^\/community\/announcements\/([^/]+)\/?$/)?.[1] ?? null;
  const selectedSuggestion =
    path.match(/^\/community\/suggestions\/([^/]+)\/?$/)?.[1] ?? null;
  const announcedPosts = useRef({ actorId: actor.id, ids: new Set<string>() });
  useEffect(() => {
    if (announcedPosts.current.actorId !== actor.id) {
      announcedPosts.current = { actorId: actor.id, ids: new Set<string>() };
    }
    if (feed.loading || feed.error) return;
    const fresh = notificationRows.filter(
      (row) =>
        !feed.readIds.includes(row.id) &&
        !announcedPosts.current.ids.has(row.id),
    );
    if (!fresh.length) return;
    fresh.forEach((row) => announcedPosts.current.ids.add(row.id));
    toast.info(
      fresh.length === 1 && fresh[0].kind === "comment"
        ? "내 글에 새 댓글이 달렸습니다."
        : "새로운 알림이 있습니다.",
      {
        id: `new-announcements-${actor.id}`,
        description:
          fresh.length === 1
            ? fresh[0].title
            : `${fresh.length}개의 알림을 확인해 주세요.`,
        duration: 6000,
        action: { label: "보기", onClick: () => openNotification(fresh[0]) },
      },
    );
  }, [
    actor.id,
    feed.notificationRows,
    feed.readIds,
    feed.loading,
    feed.error,
    building,
  ]);
  function openNotification(row: AnnouncementNotification) {
    void feed
      .markRead([row.id])
      .catch(() => toast.error("알림을 읽음 처리하지 못했습니다."));
    openAnnouncement(row.postId);
  }
  function openAnnouncement(id: string | null) {
    openCommunityPost(id, "announcement");
  }
  function openCommunityPost(
    id: string | null,
    category: "announcement" | "suggestion",
  ) {
    const base =
      category === "suggestion"
        ? "/community/suggestions"
        : "/community/announcements";
    const next = base + (id ? "/" + id : "");
    if (!navigateHistory(next)) return;
    setPath(next);
    setPage(category === "suggestion" ? "건의함" : "전달 내용");
    setNotifications(false);
    setMobile(false);
  }
  async function readAllNotifications() {
    if (reading) return;
    setReading(true);
    setNotificationError("");
    try {
      await feed.markRead(unreadIds);
    } catch {
      setNotificationError("읽음 처리하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setReading(false);
    }
  }
  const teacherName = member ? `${member.name} 선생님` : "홀로서기 선생님";
  const today = localDate();
  const upcoming = records
    .filter((r) => r.date === day && r.status !== "완료")
    .sort((a, b) => a.time.localeCompare(b.time));
  const filtered = records.filter(
    (r) =>
      (filter === "전체" || r.status === filter) &&
      `${r.name} ${r.grade} ${r.type} ${r.memo}`.includes(query) &&
      (page !== "상담 일정" || r.date === day),
  );
  useEffect(() => {
    if (!supabase || page !== "상담 일정") return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    fetchCounsels()
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          toast.error(
            "상담을 불러오지 못했습니다. 네트워크와 Supabase 테이블 설정을 확인해 주세요.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, page]);
  async function save(record: Counsel) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const saved = supabase
        ? await persistCounsel(record, Boolean(selected))
        : record;
      const next = selected
        ? records.map((r) => (r.id === saved.id ? saved : r))
        : [saved, ...records];
      if (!supabase)
        localStorage.setItem("holoseogi-counsels", JSON.stringify(next));
      setRecords(next);
      toast.success("상담 내용이 저장되었습니다.");
      setDialog(false);
    } catch {
      setSaveError(
        "저장하지 못했습니다. 연결 및 접근 권한을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }
  function moveDay(offset: number) {
    const date = new Date(day + "T12:00:00");
    date.setDate(date.getDate() + offset);
    setDay(localDate(date));
  }
  function navigate(name: string) {
    const next =
      name === "전달 내용"
        ? "/community/announcements"
        : name === "건의함"
          ? "/community/suggestions"
          : name === "상담 관리"
            ? "/counseling"
            : name === "시간표"
              ? "/timetable"
              : name === "할 일"
                ? "/todos"
              : name === "메모장"
                ? "/memo"
                : "/";
    if (!navigateHistory(next)) return;
    setPath(next);
    setPage(name);
    setMobile(false);
    setQuery("");
    setFilter("전체");
  }
  return (
    <>
      {page !== "건의함" && page !== "시간표" && page !== "메모장" && page !== "할 일" && (
        <div className="building-filter" role="group" aria-label="공통 관 선택">
          {["전체", "1", "2"].map((value) => (
            <button
              key={value}
              aria-pressed={building === value}
              onClick={() => changeBuilding(value)}
            >
              {value === "전체" ? value : `${value}관`}
            </button>
          ))}
        </div>
      )}
      {mobile && (
        <button
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-20 bg-black/20"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <TooltipProvider delayDuration={250}>
          <a
            href="#"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              navigate("대시보드");
            }}
          >
            <BrandLogo className="sidebar-logo" />
            <div>
              <strong>홀로서기</strong>
              <small>COUNSELING</small>
            </div>
          </a>
          <SidebarGroup id="workspace" title="WORKSPACE">
            {pages.map(({ name, icon: Icon }) => (
              <Tooltip key={name}>
                <TooltipTrigger asChild>
                  <button
                    className={`nav-item ${page === name ? "active" : ""}`}
                    onClick={() => navigate(name)}
                  >
                    <Icon size={18} />
                    {name}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{pageHints[name]}</TooltipContent>
              </Tooltip>
            ))}
          </SidebarGroup>
          <SidebarGroup id="community" title="COMMUNITY">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`nav-item ${page === "시간표" ? "active" : ""}`}
                onClick={() => navigate("시간표")}
              >
                <Clock3 size={18} />
                시간표
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{pageHints["시간표"]}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`nav-item ${page === "전달 내용" ? "active" : ""}`}
                onClick={() => navigate("전달 내용")}
              >
                <Megaphone size={18} />
                전달 내용
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {pageHints["전달 내용"]}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`nav-item ${page === "건의함" ? "active" : ""}`}
                onClick={() => navigate("건의함")}
              >
                <Lightbulb size={18} />
                건의함
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{pageHints["건의함"]}</TooltipContent>
          </Tooltip>
          </SidebarGroup>
          <SidebarGroup id="personal" title="PERSONAL">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`nav-item ${page === "메모장" ? "active" : ""}`}
                onClick={() => navigate("메모장")}
              >
                <StickyNote size={18} />
                메모장
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{pageHints["메모장"]}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={`nav-item ${page === "할 일" ? "active" : ""}`} onClick={() => navigate("할 일")}>
                <ListTodo size={18} />
                할 일
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{pageHints["할 일"]}</TooltipContent>
          </Tooltip>
          </SidebarGroup>
          <SidebarGroup id="control-center" title="CONTROL CENTER">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={`nav-item ${page === "활동 로그" ? "active" : ""}`}
                onClick={() => navigate("활동 로그")}
              >
                <ClipboardList size={18} />
                활동 로그
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {pageHints["활동 로그"]}
            </TooltipContent>
          </Tooltip>
          </SidebarGroup>
        </TooltipProvider>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3 text-xs text-[#62738a]">
            <button
              className="mobile-toggle"
              aria-label="메뉴 열기"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span className="hidden sm:inline">
              {page === "활동 로그"
                ? "CONTROL CENTER"
                : page === "메모장" || page === "할 일"
                  ? "PERSONAL"
                : page === "시간표" || page === "전달 내용" || page === "건의함"
                  ? "COMMUNITY"
                  : "WORKSPACE"}
            </span>
            <ChevronRight size={13} />
            <span className="text-[#17283f]">{page}</span>
          </div>
          <div ref={headerMenus} className="flex items-center gap-5 relative">
            <div className="flex items-center gap-1">
              <WeatherDialog />
              <PersonalTodos container={todoContainer} />
              <FloatingMemo container={memoContainer} />
              <IconTooltip label="알림">
              <button
                className="memo-launcher"
                aria-label="알림"
                aria-expanded={notifications}
                onClick={() => {
                  setNotifications(!notifications);
                  setProfile(false);
                }}
              >
                <Bell size={19} />
                {unreadIds.length > 0 && (
                  <span
                    aria-label={`읽지 않은 알림 ${unreadIds.length}개`}
                    className="notification-count"
                  >
                    {unreadIds.length > 99 ? "99+" : unreadIds.length}
                  </span>
                )}
              </button>
              </IconTooltip>
            </div>
            <span className="h-6 border-l" />
            <button
              className="flex items-center gap-2 text-sm"
              onClick={() => {
                setProfile(!profile);
                setNotifications(false);
              }}
              aria-expanded={profile}
            >
              <span
                className="max-w-[160px] truncate sm:max-w-[260px]"
                title={teacherName}
              >
                {teacherName}
              </span>
              <ChevronDown size={13} />
            </button>
            {notifications && (
              <div className="panel notification-panel">
                <div className="flex items-center justify-between border-b p-4">
                  <strong className="text-sm">
                    알림{" "}
                    <span className="ml-1 text-muted-foreground">
                      {unreadIds.length}
                    </span>
                  </strong>
                  <button
                    className="text-xs text-muted-foreground disabled:opacity-50"
                    disabled={reading || !unreadIds.length}
                    onClick={() => void readAllNotifications()}
                  >
                    모두 읽음
                  </button>
                </div>
                {notificationError && (
                  <p role="alert" className="p-3 text-xs text-destructive">
                    {notificationError}
                  </p>
                )}
                {feed.error ? (
                  <div className="p-4">
                    <p role="alert" className="text-xs text-destructive">
                      {feed.error}
                    </p>
                    <button className="mt-2 text-xs" onClick={feed.refresh}>
                      다시 불러오기
                    </button>
                  </div>
                ) : feed.loading ? (
                  <p role="status" className="p-6 text-center text-xs">
                    알림을 불러오는 중…
                  </p>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {notificationRows.slice(0, 30).map((row) => (
                      <button
                        key={row.id}
                        className={`notification-row ${feed.readIds.includes(row.id) ? "" : "unread"}`}
                        onClick={() => openNotification(row)}
                      >
                        <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span
                            className={`audience-badge audience-${row.building ?? "all"}`}
                          >
                            {targetLabel(row.building)}
                          </span>
                          {row.author_name} 선생님
                          {row.kind === "comment"
                            ? " · 내 글에 댓글"
                            : " · 새 전달 내용"}
                        </span>
                        <span className="block mt-2 text-sm font-bold break-words">
                          {row.title}
                        </span>
                        <span className="block mt-2 text-[10px] text-muted-foreground">
                          {relativeTime(row.created_at, notificationNow)}
                        </span>
                      </button>
                    ))}
                    {!notificationRows.length && (
                      <p className="p-8 text-center text-xs text-muted-foreground">
                        새로운 알림이 없습니다.
                      </p>
                    )}
                  </div>
                )}
                <button
                  className="w-full border-t p-3 text-xs text-muted-foreground"
                  onClick={() => openAnnouncement(null)}
                >
                  전달 내용 전체 보기
                </button>
              </div>
            )}
            {profile && (
              <div className="panel absolute right-0 top-14 z-20 w-48 p-3 shadow-lg">
                <p className="p-2 text-xs text-muted-foreground">상담 관리자</p>
                <button
                  className="nav-item"
                  onClick={() => {
                    navigate("환경 설정");
                    setProfile(false);
                  }}
                >
                  <Settings size={16} />
                  프로필 설정
                </button>
                {supabase && (
                  <>
                    <div className="my-2 border-t" />
                    <button
                      className="nav-item"
                      onClick={async () => {
                        if (!supabase) return;
                        setProfile(false);
                        try {
                          const { error } = await supabase.auth.signOut();
                          if (error)
                            toast.error(
                              "로그아웃하지 못했습니다. 다시 시도해 주세요.",
                            );
                        } catch {
                          toast.error(
                            "로그아웃하지 못했습니다. 다시 시도해 주세요.",
                          );
                        }
                      }}
                    >
                      <LogOut size={16} />
                      로그아웃
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="main">
          {page === "상담 일정" && loading && (
            <p role="status" className="mb-4 text-sm">
              상담을 불러오는 중…
            </p>
          )}
          {page === "상담 일정" && loadError && (
            <Button
              variant="outline"
              className="mb-4"
              onClick={() => setReload((n) => n + 1)}
            >
              다시 불러오기
            </Button>
          )}
          {page === "상담 일정" && (
            <div className="flex justify-end mb-5">
              <Button
                disabled={loading || loadError}
                onClick={() => {
                  setSelected(null);
                  setDialog(true);
                }}
              >
                <Plus size={16} />새 상담 등록
              </Button>
            </div>
          )}
          {page === "전달 내용" ? (
            <AnnouncementBoard
              feed={feed}
              building={building}
              actor={actor}
              selectedId={selectedAnnouncement}
              onOpen={openAnnouncement}
            />
          ) : page === "건의함" ? (
            <AnnouncementBoard
              feed={suggestionFeed}
              building={building}
              actor={actor}
              selectedId={selectedSuggestion}
              onOpen={(id) => openCommunityPost(id, "suggestion")}
              mode="suggestion"
            />
          ) : page === "대시보드" ? (
            <Dashboard building={building} onNavigate={navigateCounseling} />
          ) : page === "상담 관리" ? (
            <CounselingManagement
              building={building}
              writing={/\/new\/?$/.test(path)}
              journalId={path.match(/\/journals\/([^/]+)\/?$/)?.[1] ?? null}
              studentId={studentId}
              onNavigate={navigateCounseling}
              onDirtyChange={setJournalDirty}
            />
          ) : page === "메모장" ? (
            <div ref={setMemoContainer} className="memo-page-host" />
          ) : page === "할 일" ? (
            <div ref={setTodoContainer} />
          ) : page === "시간표" ? (
            <section className="panel p-5 sm:p-6">
            <PageHeading emoji="🗓️">시간표</PageHeading>
            <p className="py-24 text-center text-sm text-muted-foreground">
              준비중
            </p>
            </section>
          ) : page === "학생 관리" ? (
            <StudentManagement building={building} />
          ) : page === "활동 로그" ? (
            <ActivityLogs key={building} building={building} />
          ) : page === "환경 설정" ? (
            <section className="panel p-7 max-w-2xl">
              <PageHeading as="h2" emoji="⚙️" className="mb-2">내 프로필</PageHeading>
              <p className="subtext mb-6">
                가입 시 등록한 실명으로 표시됩니다. 이름 수정은 관리자에게
                문의해 주세요.
              </p>
              <label className="field">
                이름 (실명)
                <Input value={member?.name ?? "홀로서기"} readOnly />
              </label>
            </section>
          ) : page === "이용 안내" ? (
            <section className="panel p-7 max-w-2xl">
              <PageHeading as="h2" emoji="📖" className="mb-5">상담관리 시작하기</PageHeading>
              <div className="space-y-5 text-sm leading-7">
                <p>1. 학생 관리에서 학생을 추가하고 상담주기를 설정하세요.</p>
                <p>
                  2. 상담 관리에서 학생을 선택하면 상담일지를 작성하거나 지난
                  기록을 확인할 수 있습니다.
                </p>
                <p>
                  3. 상담일지를 저장하면 대시보드에 상담 완료로 반영됩니다. 활동
                  로그에서 작업 내역을 확인하세요.
                </p>
                <p className="rounded-lg bg-muted p-4">
                  {supabase
                    ? "상담은 Supabase에 저장됩니다. 같은 계정으로 로그인하면 다른 기기에서도 내 기록을 확인할 수 있습니다. 헤더에는 가입 시 등록한 실명이 표시됩니다."
                    : "현재 예시 데이터 모드입니다. 데이터는 이 브라우저에 저장됩니다. Supabase 환경 변수를 설정하면 로그인 및 서버 저장 모드로 전환됩니다."}
                </p>
              </div>
            </section>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
                {[
                  {
                    label: "전체 상담",
                    count: records.length,
                    icon: MessageSquare,
                    note: "차곡차곡 쌓인 성장의 기록",
                    color: "#eaf0f7",
                  },
                  {
                    label: "오늘의 상담",
                    count: records.filter((r) => r.date === today).length,
                    icon: CalendarDays,
                    note: "오늘 나눌 소중한 이야기",
                    color: "#edf1f8",
                  },
                  {
                    label: "상담 대기",
                    count: records.filter((r) => r.status === "대기").length,
                    icon: Clock3,
                    note: "관심과 확인이 필요해요",
                    color: "#faf2e2",
                  },
                  {
                    label: "상담 완료",
                    count: records.filter((r) => r.status === "완료").length,
                    icon: CheckCheck,
                    note: "한 걸음 더 가까워졌어요",
                    color: "#f1edf7",
                  },
                ].map(({ label, count, icon: Icon, note, color }) => (
                  <div className="panel stat" key={label}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#62738a]">{label}</span>
                      <span
                        className="rounded-lg p-2 text-[#62738a]"
                        style={{ background: color }}
                      >
                        <Icon size={18} />
                      </span>
                    </div>
                    <div className="stat-number">
                      {count}
                      <span className="text-sm font-normal text-[#748399] ml-2">
                        건
                      </span>
                    </div>
                    <p className="text-[11px] text-[#748399] mt-2">{note}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
                <section className="panel overflow-hidden">
                  <div className="p-5 sm:p-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-base font-bold">
                        {page === "학생 관리"
                          ? "학생 목록"
                          : page === "상담 일정"
                            ? "날짜별 상담"
                            : "상담 현황"}{" "}
                        <span className="text-xs font-normal text-[#62738a] ml-2">
                          {filtered.length}건
                        </span>
                      </h2>
                      <p className="subtext mt-1">
                        아이들의 이야기를 한눈에 확인하세요.
                      </p>
                    </div>
                    <BookOpen size={20} className="text-[#748399]" />
                  </div>
                  <div className="px-5 sm:px-6 pb-5 flex flex-wrap gap-3 justify-between">
                    <div className="flex gap-1 bg-[#edf1f6] rounded-lg p-1">
                      {["전체", "예정", "대기", "완료"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setFilter(s)}
                          className={`text-xs rounded-md px-3 py-1.5 ${filter === s ? "bg-white shadow-sm text-primary" : "text-[#62738a]"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3 top-2.5 text-[#748399]"
                      />
                      <Input
                        aria-label="학생 이름 또는 상담 내용 검색"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="학생 이름, 상담 내용 검색"
                        className="pl-9 text-xs w-56"
                      />
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>학생 정보</th>
                          <th>상담 유형</th>
                          <th>상담 일시</th>
                          <th>상태</th>
                          <th>
                            <span className="sr-only">상세 보기</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <button
                                className="flex items-center gap-3 text-left"
                                onClick={() => {
                                  setSelected(r);
                                  setDialog(true);
                                }}
                              >
                                <span className="avatar">{r.name[0]}</span>
                                <span className="font-bold">
                                  {r.name}
                                  <small className="block text-[11px] font-normal text-[#748399] mt-1">
                                    {r.grade}
                                  </small>
                                </span>
                              </button>
                            </td>
                            <td className="text-[#62738a]">{r.type}</td>
                            <td>
                              <span className="text-[#62738a]">
                                {r.date.replaceAll("-", ".").slice(2)}
                              </span>
                              <small className="block text-[11px] text-[#748399] mt-1">
                                {r.time}
                              </small>
                            </td>
                            <td>
                              <span className={`pill ${r.status}`}>
                                <span className="h-1 w-1 rounded-full bg-current" />
                                {r.status}
                              </span>
                            </td>
                            <td>
                              <button
                                aria-label={`${r.name} 상담 수정`}
                                onClick={() => {
                                  setSelected(r);
                                  setDialog(true);
                                }}
                              >
                                <ChevronRight
                                  size={16}
                                  className="text-[#748399]"
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filtered.length === 0 && (
                      <p className="p-12 text-center text-sm text-muted-foreground">
                        조건에 맞는 상담이 없습니다.
                      </p>
                    )}
                  </div>
                  <div className="border-t px-6 py-4 text-[11px] text-[#748399] flex justify-between">
                    <span>총 {filtered.length}개의 상담 기록</span>
                    <span>
                      기록을 눌러 자세히 보기{" "}
                      <ArrowUpRight size={12} className="inline" />
                    </span>
                  </div>
                </section>
                <div className="space-y-5">
                  <section className="panel p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-sm">상담 일정</h2>
                      <CalendarDays size={17} className="text-[#62738a]" />
                    </div>
                    <div className="flex justify-between items-center mt-5 pb-4 border-b">
                      <button
                        aria-label="이전 날짜"
                        onClick={() => moveDay(-1)}
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <input
                        aria-label="상담 날짜"
                        type="date"
                        value={day}
                        onChange={(e) =>
                          e.target.value && setDay(e.target.value)
                        }
                        className="text-sm bg-transparent w-36"
                      />
                      <button aria-label="다음 날짜" onClick={() => moveDay(1)}>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="flex justify-between mt-4 text-[11px] text-[#62738a]">
                      <span>{day === today ? "TODAY" : "SCHEDULE"}</span>
                      <span>예정된 상담 {upcoming.length}건</span>
                    </div>
                    <div className="mt-2">
                      {upcoming.map((r, i) => (
                        <button
                          key={r.id}
                          className="w-full flex gap-3 text-left py-4 border-b last:border-0"
                          onClick={() => {
                            setSelected(r);
                            setDialog(true);
                          }}
                        >
                          <span className="text-xs text-[#62738a] pt-1 w-10">
                            {r.time}
                          </span>
                          <div
                            className={`border-l-2 pl-3 ${i === 0 ? "border-[#426083]" : "border-[#dce3ed]"}`}
                          >
                            <p className="text-sm">
                              {r.name}{" "}
                              <span className="text-xs text-[#748399] ml-1">
                                {r.grade}
                              </span>
                            </p>
                            <p className="text-[11px] text-[#62738a] mt-1.5">
                              {r.type}
                            </p>
                          </div>
                        </button>
                      ))}
                      {upcoming.length === 0 && (
                        <p className="text-xs text-muted-foreground py-7 text-center">
                          예정된 상담이 없습니다.
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full mt-3 text-xs"
                      onClick={() => navigate("상담 일정")}
                    >
                      전체 일정 보기
                      <ChevronRight size={13} />
                    </Button>
                  </section>
                  <section className="rounded-xl bg-[#edf1f6] p-5 relative overflow-hidden">
                    <Sprout
                      className="absolute right-3 bottom-2 text-[#d3deeb]"
                      size={84}
                    />
                    <p className="text-[10px] tracking-widest text-[#426083]">
                      A LITTLE REMINDER
                    </p>
                    <p className="text-sm leading-7 mt-3 relative">
                      정답을 알려주기보다,
                      <br />
                      스스로 찾을 수 있도록.
                    </p>
                    <p className="text-[11px] text-[#62738a] mt-3 relative">
                      함께 성장하는 홀로서기
                    </p>
                  </section>
                </div>
              </div>
              <p className="text-[11px] text-[#748399] mt-6 flex items-center gap-1.5">
                <Check size={12} />{" "}
                {supabase
                  ? "Supabase · 변경 내용은 내 계정에 저장됩니다."
                  : "예시 데이터 · 변경 내용은 이 브라우저에 저장됩니다."}
              </p>
            </>
          )}
        </main>
      </div>
      <Dialog
        open={dialog}
        onOpenChange={(open) => {
          if (!saving) setDialog(open);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? "상담 기록 수정" : "새 상담 등록"}
            </DialogTitle>
            <DialogDescription>
              학생과 나눈 이야기, 함께할 일정을 기록해 주세요.
            </DialogDescription>
          </DialogHeader>
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError}
            </p>
          )}
          <form
            aria-busy={saving}
            key={selected?.id ?? "new"}
            className="grid gap-4 mt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name")).trim();
              if (!name) return;
              const record: Counsel = {
                id: selected?.id ?? crypto.randomUUID(),
                name,
                grade: String(data.get("grade")),
                type: String(data.get("type")),
                date: String(data.get("date")),
                time: String(data.get("time")),
                status: data.get("status") as Counsel["status"],
                memo: String(data.get("memo")).trim(),
              };
              void save(record);
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <label className="field">
                학생 이름
                <input
                  name="name"
                  required
                  maxLength={30}
                  defaultValue={selected?.name}
                  placeholder="이름 입력"
                />
              </label>
              <label className="field">
                학년
                <select
                  name="grade"
                  defaultValue={selected?.grade ?? "중학교 1학년"}
                >
                  {["초등학교", "중학교", "고등학교"].flatMap((s) =>
                    Array.from({ length: s === "초등학교" ? 6 : 3 }, (_, i) => (
                      <option key={`${s}${i}`}>
                        {s} {i + 1}학년
                      </option>
                    )),
                  )}
                </select>
              </label>
              <label className="field">
                상담 유형
                <select name="type" defaultValue={selected?.type}>
                  <option>학습 상담</option>
                  <option>학부모 상담</option>
                  <option>신규 상담</option>
                </select>
              </label>
              <label className="field">
                상태
                <select name="status" defaultValue={selected?.status ?? "예정"}>
                  <option>예정</option>
                  <option>대기</option>
                  <option>완료</option>
                </select>
              </label>
              <label className="field">
                상담 날짜
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={selected?.date ?? today}
                />
              </label>
              <label className="field">
                상담 시간
                <input
                  name="time"
                  type="time"
                  required
                  defaultValue={selected?.time ?? "14:00"}
                />
              </label>
            </div>
            <label className="field">
              상담 내용
              <textarea
                name="memo"
                rows={4}
                maxLength={3000}
                defaultValue={selected?.memo}
                placeholder="상담 내용이나 미리 확인할 사항을 적어주세요."
              />
            </label>
            <div className="flex justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setDialog(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? "저장 중…"
                  : selected
                    ? "변경 사항 저장"
                    : "상담 등록"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster position="top-center" />
    </>
  );
}
