import { supabase } from './supabase';
import { localDate } from '@/data';

export type LatestParentMessage = { student_id: string; last_sent_date: string };
type SendRecord = { student_id: string; sent_date: string };
const key = 'holoseogi-parent-message-sends';
export async function fetchLatestParentMessages(mineOnly = false): Promise<LatestParentMessage[]> {
  if (!supabase) {
    const rows: SendRecord[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    const journals: { student_id: string; date: string; parent_message_sent?: boolean }[] = JSON.parse(localStorage.getItem('holoseogi-counseling-journals') ?? '[]');
    rows.push(...journals.filter(row => row.parent_message_sent).map(row => ({ student_id: row.student_id, sent_date: row.date })));
    const latest = new Map<string, string>();
    for (const row of rows) if (row.sent_date > (latest.get(row.student_id) ?? '')) latest.set(row.student_id, row.sent_date);
    return [...latest].map(([student_id, last_sent_date]) => ({ student_id, last_sent_date }));
  }
  const result: LatestParentMessage[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(mineOnly ? 'my_student_latest_parent_messages' : 'student_latest_parent_messages').select('student_id,last_sent_date').order('student_id').range(from, from + 999);
    if (error) throw new Error('문자 전송 기록을 불러오지 못했습니다. DB 설정과 연결을 확인해 주세요.');
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
export async function recordParentMessage(student_id: string, sent_date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sent_date) || Number.isNaN(Date.parse(sent_date)) || new Date(sent_date).toISOString().slice(0, 10) !== sent_date || sent_date > localDate()) throw new Error('문자 전송 날짜는 오늘 또는 이전 날짜로 입력해 주세요.');
  if (!supabase) {
    const rows: SendRecord[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    if (!rows.some(row => row.student_id === student_id && row.sent_date === sent_date)) localStorage.setItem(key, JSON.stringify([...rows, { student_id, sent_date }]));
    return;
  }
  const { error } = await supabase.from('parent_message_sends').insert({ student_id, sent_date });
  if (error && error.code !== '23505') throw new Error('문자 전송 날짜를 저장하지 못했습니다. DB 설정과 권한을 확인해 주세요.');
}
