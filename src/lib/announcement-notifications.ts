import { supabase } from './supabase';
import type { Announcement, AnnouncementComment } from './announcements';

export type AnnouncementNotification = Announcement & { postId: string; kind: 'post' | 'comment' };

export function relativeTime(value: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000));
  if (!Number.isFinite(minutes) || minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / 1440)}일 전`;
}

export async function fetchCommentNotifications(posts: Announcement[], actorId: string): Promise<AnnouncementNotification[]> {
  const owned = posts.filter(post => post.author_id === actorId && (post.category ?? 'announcement') === 'announcement');
  const postMap = new Map(owned.map(post => [post.id, post]));
  const comments: AnnouncementComment[] = [];
  if (!supabase) comments.push(...JSON.parse(localStorage.getItem('holoseogi-announcement-comments') ?? '[]'));
  else for (let start = 0; start < owned.length; start += 100) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from('announcement_comments')
        .select('id,announcement_id,author_id,author_name,content,created_at')
        .in('announcement_id', owned.slice(start, start + 100).map(post => post.id))
        .neq('author_id', actorId).order('created_at', { ascending: false }).order('id').range(from, from + 999);
      if (error) throw error;
      comments.push(...data);
      if (data.length < 1000) break;
    }
  }
  return comments.filter(comment => postMap.has(comment.announcement_id) && comment.author_id !== actorId).map(comment => ({
    ...postMap.get(comment.announcement_id)!,
    id: `comment:${comment.id}`, postId: comment.announcement_id, kind: 'comment',
    author_id: comment.author_id, author_name: comment.author_name, created_at: comment.created_at,
  }));
}

export async function fetchCommentNotificationReads(actorId: string): Promise<string[]> {
  if (!supabase) return JSON.parse(localStorage.getItem(`holoseogi-comment-reads-${actorId}`) ?? '[]');
  const result: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('announcement_comment_reads').select('comment_id')
      .eq('user_id', actorId).order('comment_id').range(from, from + 999);
    if (error) throw error;
    result.push(...data.map(row => `comment:${row.comment_id}`));
    if (data.length < 1000) return result;
  }
}

export async function markCommentNotificationsRead(ids: string[], actorId: string) {
  if (!ids.length) return;
  if (!supabase) {
    const previous = await fetchCommentNotificationReads(actorId);
    localStorage.setItem(`holoseogi-comment-reads-${actorId}`, JSON.stringify([...new Set([...previous, ...ids])]));
    return;
  }
  for (let from = 0; from < ids.length; from += 500) {
    const { error } = await supabase.from('announcement_comment_reads').upsert(
      ids.slice(from, from + 500).map(id => ({ user_id: actorId, comment_id: id.slice('comment:'.length) })),
      { onConflict: 'user_id,comment_id', ignoreDuplicates: true });
    if (error) throw error;
  }
}
