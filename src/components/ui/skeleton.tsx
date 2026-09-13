import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block rounded-md bg-[#e8edf3] motion-safe:animate-pulse", className)} />;
}

export function LoadingSkeleton({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <div role="status" aria-busy="true" className={className}>
    <span className="sr-only">{label} 불러오는 중</span>
    <div aria-hidden="true">{children}</div>
  </div>;
}

export function TableSkeleton({ columns, rows = 8, footer = false, label }: { columns: string[]; rows?: number; footer?: boolean; label: string }) {
  return <LoadingSkeleton label={label}>
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
        <tbody>{Array.from({ length: rows }, (_, row) => <tr key={row}>
          {columns.map((column, index) => <td key={column}><Skeleton className={cn("h-5 max-w-full", index === 0 ? "w-24" : index === 1 ? "w-16" : "w-28", row % 3 === 1 && "opacity-70")} /></td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {footer && <div className="border-t p-4 flex justify-end items-center gap-3"><Skeleton className="h-9 w-14" /><Skeleton className="h-5 w-16" /><Skeleton className="h-9 w-14" /></div>}
  </LoadingSkeleton>;
}

export function DashboardSkeleton() {
  return <LoadingSkeleton label="대시보드">
    <div className="dashboard-columns">
      {[0, 1, 2].map(column => <section key={column} className="panel p-5 dashboard-section">
        <div className="flex items-center gap-2 mb-4"><Skeleton className="h-5 w-5" /><Skeleton className="h-6 w-32" /><Skeleton className="ml-auto h-7 w-9" /></div>
        <Skeleton className="h-9 w-full mb-2" />
        <div className="dashboard-list space-y-2">
          {Array.from({ length: 5 }, (_, row) => <div key={row} className="rounded-lg border border-[#eaf0f5] p-3 flex items-center gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-20 max-w-full" /><Skeleton className="h-3 w-28 max-w-full" /></div>
            <Skeleton className="h-6 w-10 shrink-0" />
          </div>)}
        </div>
        {column > 0 && <div className="mt-5 border-t border-[#dce6f2] pt-4"><Skeleton className={column === 1 ? "h-9 w-full" : "h-12 w-full"} /></div>}
      </section>)}
    </div>
  </LoadingSkeleton>;
}

export function CounselingSkeleton({ detail, journal }: { detail: boolean; journal: boolean }) {
  return <section className="panel overflow-hidden">
    <LoadingSkeleton label="상담 정보" className="p-5 sm:p-6">
      <Skeleton className="h-6 w-32" /><Skeleton className="mt-2 h-4 w-64 max-w-full" />
      <Skeleton className="mt-5 h-9 w-60 max-w-full" />
    </LoadingSkeleton>
    {journal ? <LoadingSkeleton label="상담일지" className="p-5 sm:p-7 space-y-5">
      <Skeleton className="h-10 w-full" /><Skeleton className="mt-5 h-64 w-full" /><Skeleton className="mt-5 h-10 w-24 ml-auto" />
    </LoadingSkeleton> : <TableSkeleton label="상담 목록" columns={detail ? ["날짜", "상담자"] : ["좌석번호", "이름", "횟수", "마지막 상담", "마지막 문자 전송", "상담 주기"]} rows={detail ? 7 : 8} />}
  </section>;
}
