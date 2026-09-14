import { supabase } from './supabase';

export type PersonalTodo = {
  id: string;
  owner_id: string;
  title: string;
  completed: boolean;
  created_at: string;
};
const columns = 'id,owner_id,title,completed,created_at';
const localKey = (ownerId: string) => `holoseogi-personal-todos-${ownerId}`;
const localRows = (ownerId: string): PersonalTodo[] => JSON.parse(localStorage.getItem(localKey(ownerId)) ?? '[]');

export async function fetchPersonalTodos(ownerId: string): Promise<PersonalTodo[]> {
  if (!supabase) return localRows(ownerId);
  const rows: PersonalTodo[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('personal_todos').select(columns)
      .eq('owner_id', ownerId).order('created_at').order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export async function addPersonalTodo(ownerId: string, title: string): Promise<PersonalTodo> {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 300) throw new Error('할 일은 1~300자로 입력해 주세요.');
  if (!supabase) {
    const row = { id: crypto.randomUUID(), owner_id: ownerId, title: trimmed, completed: false, created_at: new Date().toISOString() };
    localStorage.setItem(localKey(ownerId), JSON.stringify([...localRows(ownerId), row]));
    return row;
  }
  const { data, error } = await supabase.from('personal_todos').insert({ owner_id: ownerId, title: trimmed }).select(columns).single();
  if (error) throw error;
  return data;
}

export async function completePersonalTodo(ownerId: string, id: string, completed: boolean): Promise<PersonalTodo> {
  if (!supabase) {
    const rows = localRows(ownerId);
    const row = rows.find(item => item.id === id);
    if (!row) throw new Error('할 일을 찾을 수 없습니다.');
    const next = { ...row, completed };
    localStorage.setItem(localKey(ownerId), JSON.stringify(rows.map(item => item.id === id ? next : item)));
    return next;
  }
  const { data, error } = await supabase.from('personal_todos').update({ completed }).eq('owner_id', ownerId).eq('id', id).select(columns).single();
  if (error) throw error;
  return data;
}

export async function deletePersonalTodo(ownerId: string, id: string) {
  if (!supabase) {
    localStorage.setItem(localKey(ownerId), JSON.stringify(localRows(ownerId).filter(row => row.id !== id)));
    return;
  }
  const { error } = await supabase.from('personal_todos').delete().eq('owner_id', ownerId).eq('id', id);
  if (error) throw error;
}
