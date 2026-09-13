import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchAnnouncements,
  fetchAnnouncementCommentCounts,
  fetchAnnouncementReads,
  markAnnouncementsRead,
  type Announcement,
  type AnnouncementCategory,
} from "@/lib/announcements";
import { supabase } from "@/lib/supabase";
import { fetchCommentNotifications, fetchCommentNotificationReads, markCommentNotificationsRead, type AnnouncementNotification } from "@/lib/announcement-notifications";

export function useAnnouncements(
  actorId: string,
  category: AnnouncementCategory = "announcement",
) {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [commentNotifications, setCommentNotifications] = useState<AnnouncementNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const channel = client
      .channel(`announcements-${category}-${actorId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        refresh,
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcement_comments" }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      void client.removeChannel(channel);
    };
  }, [actorId, category, refresh]);
  useEffect(() => {
    let active = true,
      fetching = false;
    const current = ++generation.current;
    async function load() {
      if (fetching) return;
      fetching = true;
      try {
        const [posts, reads, commentReads] = await Promise.all([
          fetchAnnouncements(category),
          fetchAnnouncementReads(actorId),
          category === "announcement" ? fetchCommentNotificationReads(actorId) : Promise.resolve([]),
        ]);
        const notifications = category === "announcement" ? await fetchCommentNotifications(posts, actorId) : [];
        const counts = await fetchAnnouncementCommentCounts(
          posts.map((post) => post.id),
        );
        const withCounts = posts.map((post) => ({
          ...post,
          comment_count: counts[post.id] ?? 0,
        }));
        if (active && generation.current === current) {
          setRows(
            withCounts.sort(
              (a, b) =>
                b.created_at.localeCompare(a.created_at) ||
                b.id.localeCompare(a.id),
            ),
          );
          setReadIds([...reads, ...commentReads]);
          setCommentNotifications(notifications);
          setError("");
        }
      } catch {
        if (active)
          setError(
            "전달 내용을 불러오지 못했습니다. 연결과 전달 내용 DB 설정을 확인해 주세요.",
          );
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    }
    void load();
    const focus = () => {
      if (!document.hidden) void load();
    };
    const timer = window.setInterval(focus, 30_000);
    window.addEventListener("focus", focus);
    window.addEventListener("storage", focus);
    window.addEventListener("announcements-changed", focus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", focus);
      window.removeEventListener("announcements-changed", focus);
    };
  }, [actorId, category, revision]);
  const markRead = async (ids: string[]) => {
    const allIds = [...new Set([...ids, ...commentNotifications.filter(row => ids.includes(row.postId)).map(row => row.id)])];
    await Promise.all([
      markAnnouncementsRead(allIds.filter(id => !id.startsWith("comment:")), actorId),
      markCommentNotificationsRead(allIds.filter(id => id.startsWith("comment:")), actorId),
    ]);
    setReadIds((current) => [...new Set([...current, ...allIds])]);
    refresh();
  };
  const added = (row: Announcement) => {
    setRows((current) => [
      { ...row, comment_count: 0 },
      ...current.filter((item) => item.id !== row.id),
    ]);
    refresh();
  };
  const notificationRows: AnnouncementNotification[] = [
    ...rows.filter(row => row.author_id !== actorId).map(row => ({ ...row, postId: row.id, kind: "post" as const })),
    ...commentNotifications,
  ].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return { rows, notificationRows, readIds, loading, error, refresh, markRead, added };
}
