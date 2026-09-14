import { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ListTodo, Plus, Trash2 } from 'lucide-react';
import { MemberProfileContext } from './auth-gate';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { IconTooltip } from './ui/icon-tooltip';
import { PageHeading } from './ui/page-heading';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { addPersonalTodo, completePersonalTodo, deletePersonalTodo, fetchPersonalTodos, type PersonalTodo } from '@/lib/personal-todos';

export function PersonalTodos({ container }: { container: HTMLDivElement | null }) {
  const member = useContext(MemberProfileContext);
  const ownerId = member?.id ?? 'demo';
  return <TodoWorkspace key={ownerId} ownerId={ownerId} container={container} />;
}

function TodoWorkspace({ ownerId, container }: { ownerId: string; container: HTMLDivElement | null }) {
  const [items, setItems] = useState<PersonalTodo[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const remaining = items.filter(item => !item.completed).length;

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(false);
    fetchPersonalTodos(ownerId).then(rows => {
      if (active) setItems(rows);
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ownerId, retry]);

  async function mutate(action: () => Promise<void>) {
    if (lock.current || loading || loadError) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); }
    catch { setError('저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.'); }
    finally { lock.current = false; setBusy(false); }
  }

  function list() {
    return <div className="space-y-5" aria-busy={loading || busy}>
      {!loading && !loadError && <>
        <p className="sr-only" role="status">남은 할 일 {remaining}개 · 완료 {items.length - remaining}개</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-2xl bg-[#edf2f8] px-4 py-4">
            <span aria-hidden="true" className="text-2xl">📝</span>
            <div><p className="text-xs text-[#62738a]">남은 할 일</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#17283f]">{remaining}<span className="ml-1 text-xs font-normal text-[#62738a]">개</span></p></div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#eef6f0] px-4 py-4">
            <span aria-hidden="true" className="text-2xl">✅</span>
            <div><p className="text-xs text-[#60816b]">완료</p><p className="mt-1 text-2xl font-bold tabular-nums text-[#365b43]">{items.length - remaining}<span className="ml-1 text-xs font-normal text-[#60816b]">개</span></p></div>
          </div>
        </div>
      </>}
      <form className="flex items-center gap-2 rounded-md border border-[#e1e7ef] bg-[#f8f9fc] p-2 focus-within:border-[#9aafc7] transition-colors" aria-label="할 일 추가" onSubmit={event => {
        event.preventDefault();
        if (!draft.trim()) return;
        void mutate(async () => {
          const row = await addPersonalTodo(ownerId, draft);
          setItems(current => [...current, row]); setDraft('');
        });
      }}>
        <Input aria-label="새 할 일" placeholder="어떤 일을 해야 하나요?" maxLength={300} value={draft} disabled={loading || loadError || busy} onChange={event => setDraft(event.target.value)} className="min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0" />
        <Button type="submit" disabled={!draft.trim() || loading || loadError || busy} className="shrink-0 rounded-md"><Plus size={16} />추가</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">할 일을 불러오는 중…</p>
        : loadError ? <div role="alert" className="py-6 text-center space-y-3"><p className="text-sm">할 일을 불러오지 못했습니다.</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>다시 불러오기</Button></div>
        : <>
          {items.length === 0 ? <div className="rounded-2xl border border-dashed border-[#e1e7ef] px-5 py-12 text-center"><span aria-hidden="true" className="text-3xl">🌱</span><p className="mt-4 text-sm font-semibold text-[#426083]">작은 일부터 하나씩</p><p className="mt-2 text-xs text-muted-foreground">챙겨야 할 일을 적고, 끝내면 체크해 보세요.</p></div>
            : <div className="space-y-6">
              {[false, true].map(completed => {
                const rows = items.filter(item => item.completed === completed);
                if (!rows.length) return null;
                return <section key={String(completed)} aria-label={completed ? '완료한 할 일' : '진행 중인 할 일'}>
                  <h3 className="mb-3 px-1 text-xs font-semibold text-muted-foreground">{completed ? '완료한 일' : '해야 할 일'}</h3>
                  <ul className="space-y-2">
                    {rows.map(item => <li key={item.id} className={`group flex items-center gap-3 rounded-md border px-4 py-3 transition-colors ${item.completed ? 'border-transparent bg-[#f7f8fa]' : 'border-[#e5eaf1] bg-white hover:border-[#c7d4e3] hover:bg-[#fcfdff]'}`}>
                      <label className="flex flex-1 min-w-0 cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={item.completed} disabled={busy} className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[#62866d] disabled:cursor-wait" onChange={() => void mutate(async () => {
                          const row = await completePersonalTodo(ownerId, item.id, !item.completed);
                          setItems(current => current.map(value => value.id === row.id ? row : value));
                        })} />
                        <span className={`text-sm leading-6 break-words min-w-0 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                      </label>
                      <Button variant="ghost" size="icon" className="shrink-0 rounded-lg text-[#9aaabe] hover:bg-[#fceeee] hover:text-[#b55d5d]" aria-label={`${item.title} 삭제`} disabled={busy} onClick={() => void mutate(async () => {
                        await deletePersonalTodo(ownerId, item.id);
                        setItems(current => current.filter(row => row.id !== item.id));
                      })}><Trash2 size={15} /></Button>
                    </li>)}
                  </ul>
                </section>;
              })}
            </div>}
        </>}
    </div>;
  }

  return <>
    <Dialog>
      <IconTooltip label="할 일"><DialogTrigger asChild><button type="button" className="memo-launcher" aria-label="내 할 일 열기"><ListTodo size={19} /></button></DialogTrigger></IconTooltip>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-xl gap-6">
        <DialogHeader className="text-left pr-6"><DialogTitle className="flex items-center gap-2.5 text-xl"><span aria-hidden="true">📋</span>할 일</DialogTitle><DialogDescription>하나씩 정리하고, 가볍게 체크하세요.</DialogDescription></DialogHeader>
        {list()}
      </DialogContent>
    </Dialog>
    {container && createPortal(<section className="panel w-full p-5 sm:p-6" aria-label="내 할 일">
      <div className="mb-7"><PageHeading emoji="📋">할 일</PageHeading><p className="subtext mt-2">하나씩 정리하고, 가볍게 체크하세요.</p></div>
      {list()}
    </section>, container)}
  </>;
}
