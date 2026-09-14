import { supabase } from "./supabase";
import { saveLocalWithLog } from "./activity-logs";

export type AnnouncementCategory = "announcement" | "suggestion";
export type Announcement = {
  id: string;
  title: string;
  content: string;
  building: number | null;
  author_id: string | null;
  author_name: string;
  created_at: string;
  comment_count?: number;
  category?: AnnouncementCategory;
};
export type AnnouncementComment = {
  id: string;
  announcement_id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
};
export type AnnouncementDraft = Pick<
  Announcement,
  "title" | "content" | "building"
>;
const key = "holoseogi-announcements";
const commentKey = "holoseogi-announcement-comments";
export const targetLabel = (building: number | null) =>
  building === null ? "전체" : `${building}관`;
export const matchesTarget = (row: Announcement, building: string) =>
  building === "전체" ||
  row.building === null ||
  String(row.building) === building;

export async function fetchAnnouncements(
  category: AnnouncementCategory = "announcement",
): Promise<Announcement[]> {
  if (!supabase)
    return JSON.parse(localStorage.getItem(key) ?? "[]").filter(
      (row: Announcement) => (row.category ?? "announcement") === category,
    );
  const rows: Announcement[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id,title,content,building,author_id,author_name,created_at,category",
      )
      .eq("category", category)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + 999);
    if (error && category === "announcement") {
      const legacy = await supabase
        .from("announcements")
        .select("id,title,content,building,author_id,author_name,created_at")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, from + 999);
      if (legacy.error) throw error;
      rows.push(
        ...legacy.data.map((row) => ({
          ...row,
          category: "announcement" as const,
        })),
      );
      if (legacy.data.length < 1000) return rows;
      continue;
    }
    if (error)
      throw new Error(
        "건의함 기능을 사용하려면 Supabase 마이그레이션 202609130021_suggestions.sql을 먼저 적용해 주세요.",
      );
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function createAnnouncement(
  draft: AnnouncementDraft,
  actor: { id: string; name: string },
  category: AnnouncementCategory = "announcement",
): Promise<Announcement> {
  const title = draft.title.trim(),
    content = draft.content.trim();
  if (!title || title.length > 120 || !content || content.length > 10000)
    throw new Error("제목과 내용을 확인해 주세요.");
  if (![null, 1, 2].includes(draft.building))
    throw new Error("전달 대상을 선택해 주세요.");
  if (!supabase) {
    const row = {
      ...draft,
      title,
      content,
      id: crypto.randomUUID(),
      author_id: actor.id,
      author_name: actor.name,
      created_at: new Date().toISOString(),
      category,
    };
    const allRows = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (category === "announcement")
      saveLocalWithLog(key, [...allRows, row], {
        actor_name: actor.name,
        action: "전달 내용 등록",
        student_id: null,
        student_name: "",
        seat_number: "",
        building: row.building,
        target_type: "announcement",
        target_name: title,
        changes: {
          audience: { before: null, after: targetLabel(row.building) },
        },
      });
    else localStorage.setItem(key, JSON.stringify([...allRows, row]));
    window.dispatchEvent(new Event("announcements-changed"));
    return { ...row, comment_count: 0 };
  }
  const { data, error } = await supabase
    .from("announcements")
    .insert({ ...draft, title, content, category })
    .select(
      "id,title,content,building,author_id,author_name,created_at,category",
    )
    .single();
  if (error)
    throw new Error(
      "전달 내용을 등록하지 못했습니다. 연결과 권한을 확인해 주세요.",
    );
  return data as Announcement;
}

export async function deleteAnnouncement(row: Announcement, actorId: string) {
  if (!actorId || row.author_id !== actorId || (row.category ?? "announcement") !== "announcement")
    throw new Error("본인이 작성한 전달 내용만 삭제할 수 있습니다.");
  if (!supabase) {
    const rows: Announcement[] = JSON.parse(localStorage.getItem(key) ?? "[]");
    const stored = rows.find((item) => item.id === row.id);
    if (!stored || stored.author_id !== actorId || (stored.category ?? "announcement") !== "announcement")
      throw new Error("삭제할 전달 내용이 없거나 삭제 권한이 없습니다.");
    localStorage.setItem(key, JSON.stringify(rows.filter((item) => item.id !== row.id)));
    const comments: AnnouncementComment[] = JSON.parse(localStorage.getItem(commentKey) ?? "[]");
    localStorage.setItem(commentKey, JSON.stringify(comments.filter((item) => item.announcement_id !== row.id)));
  } else {
    const { data, error } = await supabase.from("announcements").delete()
      .eq("id", row.id).eq("author_id", actorId).eq("category", "announcement").select("id");
    if (error || !data?.length)
      throw new Error("삭제하지 못했습니다. 삭제 권한과 연결 상태를 확인해 주세요.");
  }
  window.dispatchEvent(new Event("announcements-changed"));
}

export async function fetchAnnouncementCommentCounts(
  ids: string[],
): Promise<Record<string, number>> {
  if (!ids.length) return {};
  if (!supabase) {
    const rows: AnnouncementComment[] = JSON.parse(
      localStorage.getItem(commentKey) ?? "[]",
    );
    return rows
      .filter((row) => ids.includes(row.announcement_id))
      .reduce<Record<string, number>>((counts, row) => {
        counts[row.announcement_id] = (counts[row.announcement_id] ?? 0) + 1;
        return counts;
      }, {});
  }
  const { data, error } = await supabase
    .from("announcement_comments")
    .select("announcement_id")
    .in("announcement_id", ids);
  if (error) throw error;
  return data.reduce<Record<string, number>>((counts, row) => {
    counts[row.announcement_id] = (counts[row.announcement_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function fetchAnnouncementComments(
  announcementId: string,
): Promise<AnnouncementComment[]> {
  if (!supabase)
    return JSON.parse(localStorage.getItem(commentKey) ?? "[]")
      .filter(
        (row: AnnouncementComment) => row.announcement_id === announcementId,
      )
      .sort((a: AnnouncementComment, b: AnnouncementComment) =>
        a.created_at.localeCompare(b.created_at),
      );
  const { data, error } = await supabase
    .from("announcement_comments")
    .select("id,announcement_id,author_id,author_name,content,created_at")
    .eq("announcement_id", announcementId)
    .order("created_at")
    .order("id");
  if (error) throw error;
  return data as AnnouncementComment[];
}

export async function createAnnouncementComment(
  announcementId: string,
  content: string,
  actor: { id: string; name: string },
): Promise<AnnouncementComment> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000)
    throw new Error("댓글 내용을 확인해 주세요.");
  if (!supabase) {
    const row: AnnouncementComment = {
      id: crypto.randomUUID(),
      announcement_id: announcementId,
      author_id: actor.id,
      author_name: actor.name,
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(
      commentKey,
      JSON.stringify([
        ...JSON.parse(localStorage.getItem(commentKey) ?? "[]"),
        row,
      ]),
    );
    window.dispatchEvent(new Event("announcements-changed"));
    return row;
  }
  const { data, error } = await supabase
    .from("announcement_comments")
    .insert({ announcement_id: announcementId, content: trimmed })
    .select("id,announcement_id,author_id,author_name,content,created_at")
    .single();
  if (error)
    throw new Error("댓글을 등록하지 못했습니다. 연결과 권한을 확인해 주세요.");
  window.dispatchEvent(new Event("announcements-changed"));
  return data as AnnouncementComment;
}

export async function fetchAnnouncementReads(
  actorId: string,
): Promise<string[]> {
  if (!supabase)
    return JSON.parse(localStorage.getItem(`${key}-reads-${actorId}`) ?? "[]");
  const rows: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", actorId)
      .order("announcement_id")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data.map((row) => row.announcement_id));
    if (data.length < 1000) return rows;
  }
}

export async function markAnnouncementsRead(ids: string[], actorId: string) {
  if (!ids.length) return;
  if (!supabase) {
    const existing = await fetchAnnouncementReads(actorId);
    localStorage.setItem(
      `${key}-reads-${actorId}`,
      JSON.stringify([...new Set([...existing, ...ids])]),
    );
    return;
  }
  for (let from = 0; from < ids.length; from += 500) {
    const { error } = await supabase.from("announcement_reads").upsert(
      ids
        .slice(from, from + 500)
        .map((announcement_id) => ({ announcement_id, user_id: actorId })),
      { onConflict: "user_id,announcement_id", ignoreDuplicates: true },
    );
    if (error)
      throw new Error("알림을 읽음 처리하지 못했습니다. 다시 시도해 주세요.");
  }
}
