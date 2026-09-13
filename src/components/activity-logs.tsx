import { TableSkeleton } from "./ui/skeleton";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  activityActions,
  fetchActivityLogs,
  fetchActivityTeachers,
  type ActivityLog,
} from "@/lib/activity-logs";

export function ActivityLogs({ building }: { building: string }) {
  const [teacher, setTeacher] = useState("");
  const [action, setAction] = useState("");
  const [date, setDate] = useState("");
  const [teachers, setTeachers] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<ActivityLog[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchActivityTeachers()
      .then((values) => {
        if (active) setTeachers(values);
      })
      .catch(() => {
        if (active) setTeachers([]);
      });
    return () => {
      active = false;
    };
  }, [reload]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRows([]);
    setHasMore(false);
    const timer = window.setTimeout(() => {
      fetchActivityLogs({ building, teacher, action, date }, page)
        .then((result) => {
          if (active) {
            setRows(result.rows);
            setHasMore(result.hasMore);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "활동 로그를 불러오지 못했습니다. 연결과 활동 로그 DB 설정을 확인해 주세요.",
            );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [building, teacher, action, date, page, reload]);
  const teacherOptions = [
    ...new Set([...teachers, ...rows.map((row) => row.actor_name)]),
  ].sort((a, b) => a.localeCompare(b));
  return (
    <section className="panel overflow-hidden">
      <div className="p-5 flex items-center justify-between">
        <div>
          <h2 className="font-bold">활동 로그</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            선생님들의 활동 기록을 확인할 수 있습니다.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={loading}
          onClick={() => {
            setPage(0);
            setReload((value) => value + 1);
          }}
        >
          새로고침
        </Button>
      </div>
      <div className="px-5 pb-5 flex flex-wrap gap-3">
        <select
          aria-label="선생님 필터"
          className="rounded-md border bg-white px-3 text-sm"
          value={teacher}
          onChange={(event) => {
            setTeacher(event.target.value);
            setPage(0);
          }}
        >
          <option value="">전체 선생님</option>
          {teacherOptions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <select
          aria-label="유형 필터"
          className="rounded-md border bg-white px-3 text-sm"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(0);
          }}
        >
          <option value="">전체 유형</option>
          {activityActions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs">
          날짜
          <input
            className="rounded-md border p-2"
            type="date"
            aria-label="날짜"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      {loading ? (
        <TableSkeleton label="활동 로그" columns={["일시 (한국 시간)", "선생님", "유형", "대상"]} footer />
      ) : error ? (
        <p role="alert" className="p-5 text-sm">
          {error}
        </p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>일시 (한국 시간)</th>
                  <th>선생님</th>
                  <th>유형</th>
                  <th>대상</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {new Intl.DateTimeFormat("ko-KR", {
                        timeZone: "Asia/Seoul",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      }).format(new Date(row.occurred_at))}
                    </td>
                    <td>{row.actor_name}</td>
                    <td>{row.action}</td>
                    <td>
                      {row.target_type === "announcement" ? row.target_name || "전달 내용" : (
                        <span className="inline-flex items-center gap-2">
                          {row.building != null && <span className="text-xs text-muted-foreground">{row.building}관</span>}
                          <span className="font-semibold text-[#426083]">{row.seat_number || "좌석 미등록"}</span>
                          <span>{row.student_name || "학생 정보 없음"}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <p className="p-10 text-center text-sm text-muted-foreground">
              조건에 맞는 활동 로그가 없습니다.
            </p>
          )}
          <div className="border-t p-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              이전
            </Button>
            <span className="text-sm">{page + 1}페이지</span>
            <Button
              variant="outline"
              disabled={!hasMore}
              onClick={() => setPage((value) => value + 1)}
            >
              다음
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
