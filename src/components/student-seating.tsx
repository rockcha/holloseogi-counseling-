import { useState } from "react";
import { DoorOpen, LayoutGrid } from "lucide-react";
import type { Student } from "@/lib/students";
import { PageHeading } from "./ui/page-heading";
import { Button } from "./ui/button";

type Seat = { number: number; x: number; y: number };
type Room = "502" | "503" | "504";
type RoomLayout = {
  width: number;
  height: number;
  building: number;
  seats: Seat[];
  plan: string[];
};
const column = (
  numbers: number[],
  x: number,
  start: number,
  step: number,
): Seat[] =>
  numbers.map((number, index) => ({ number, x, y: start + index * step }));
const layouts: Record<Room, RoomLayout> = {
  "502": {
    width: 580,
    height: 760,
    building: 2,
    plan: [
      "M20 74 H560 V742 H20 Z",
      "M20 150 H560 M20 220 H560 M20 290 H560 M20 360 H560 M20 430 H560 M20 500 H560 M20 570 H560 M20 640 H560",
      "M112 74 V742 M204 74 V742 M296 74 V742 M388 74 V742 M480 74 V742",
    ],
    seats: [
      ...column([15, 16, 17, 18, 19], 18, 100, 125),
      ...column([10, 11, 12, 13, 14], 220, 162, 125),
      ...column([6, 7, 8, 9], 316, 225, 125),
      ...column([1, 2, 3, 4, 5], 466, 162, 125),
    ],
  },
  "503": {
    width: 1110,
    height: 860,
    building: 2,
    plan: [
      "M20 94 H1090 V840 H20 Z",
      "M20 178 H1090 M20 258 H1090 M20 338 H1090 M20 418 H1090 M20 498 H1090 M20 578 H1090 M20 658 H1090 M20 738 H1090",
      "M200 94 V840 M390 94 V840 M580 94 V840 M770 94 V840 M960 94 V840",
    ],
    seats: [
      ...column([7, 6, 5, 4, 3, 2, 1], 18, 150, 80),
      ...column([12, 11, 10, 9, 8], 198, 246, 120),
      ...column([18, 17, 16, 15, 14, 13], 294, 186, 120),
      ...column([23, 22, 21, 20, 19], 478, 246, 120),
      ...column([28, 27, 26, 25, 24], 574, 186, 120),
      ...column([33, 32, 31, 30, 29], 758, 246, 120),
      ...column([39, 38, 37, 36, 35, 34], 854, 186, 120),
      ...column([46, 45, 44, 43, 42, 41, 40], 996, 150, 80),
    ],
  },
  "504": {
    width: 760,
    height: 930,
    building: 2,
    plan: [
      "M18 18 H742 V912 H18 Z",
      "M112 18 V912 M204 18 V912 M396 18 V912 M488 18 V912 M588 18 V912",
      "M18 182 H204 M18 286 H204 M18 390 H204 M18 494 H204 M18 598 H204 M18 702 H204",
      "M204 182 H300 V286 H204 M204 390 H300 V494 H204 M396 182 H492 V286 H396 M396 390 H492 V494 H396",
      "M588 286 H742 M588 390 H742 M588 494 H742 M588 598 H742 M588 702 H742",
    ],
    seats: [
      ...column([9, 8, 7, 6, 5], 18, 105, 72),
      ...column([4, 3, 2, 1], 18, 595, 72),
      ...column([16, 15, 14, 13, 12, 11, 10], 180, 150, 104),
      ...column([23, 22, 21, 20, 19, 18, 17], 276, 202, 104),
      ...column([30, 29, 28, 27, 26, 25, 24], 444, 150, 104),
      ...column([37, 36, 35, 34, 33, 32, 31], 540, 202, 104),
      ...column([44, 43, 42], 646, 275, 72),
      ...column([41, 40, 39, 38], 646, 595, 72),
    ],
  },
};
export function seatNumber(room: Room, number: number) {
  return room === "502"
    ? `502-${number}`
    : `${room === "503" ? "W" : "M"}${String(number).padStart(2, "0")}`;
}
function normalizedSeat(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/^(W|M|502-)0+(\d)/, "$1$2");
}

function RoomPlan({ layout }: { layout: RoomLayout }) {
  return (
    <svg
      className="seating-floorplan"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
      {layout.plan.map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}

export function StudentSeating({
  building,
  students,
  loading,
  error,
  onRetry,
  onSelect,
}: {
  building: string;
  students: Student[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onSelect: (student: Student | null, seat: string) => void;
}) {
  const [room, setRoom] = useState<Room>("502");
  const selectedBuilding = building === "전체" ? "2" : building;
  const activeRoom = room;
  const layout = layouts[activeRoom];
  const occupants = new Map(
    students
      .filter((student) => student.building === layout.building)
      .map((student) => [normalizedSeat(student.seat_number), student]),
  );
  const occupied = layout.seats.filter((seat) =>
    occupants.has(normalizedSeat(seatNumber(activeRoom, seat.number))),
  ).length;

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <PageHeading emoji="🪑">배치도</PageHeading>
          <p className="subtext mt-2">
            학생이 있는 좌석은 정보 수정, 빈 좌석은 학생 추가가 가능합니다.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedBuilding === "2" && (
            <label className="seating-select-label">
              강의실
              <select
                aria-label="강의실 선택"
                value={activeRoom}
                onChange={(event) => setRoom(event.target.value as Room)}
              >
                <option value="502">502호</option>
                <option value="503">503호 · W</option>
                <option value="504">504호 · M</option>
              </select>
            </label>
          )}
        </div>
      </div>
      {selectedBuilding === "1" ? (
        <div className="seating-preparing">
          <LayoutGrid size={36} aria-hidden="true" />
          <h2>1관 배치도 준비 중</h2>
          <p>배치도를 준비하고 있습니다.</p>
        </div>
      ) : loading ? (
        <p
          role="status"
          className="py-16 text-center text-sm text-muted-foreground"
        >
          좌석 정보를 불러오는 중…
        </p>
      ) : error ? (
        <div role="alert" className="py-12 text-center">
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={onRetry}>
            다시 불러오기
          </Button>
        </div>
      ) : (
        <>
          <div className="seating-summary">
            <div className="seating-summary-main">
              <strong className="seating-count">
                사용 중 {occupied}명 <span>/ 전체 {layout.seats.length}석</span>
              </strong>
              <div
                className="seating-progress"
                role="progressbar"
                aria-label="좌석 사용률"
                aria-valuemin={0}
                aria-valuemax={layout.seats.length}
                aria-valuenow={occupied}
              >
                <div
                  className="seating-progress-bar"
                  style={{
                    width: `${(occupied / layout.seats.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="seating-legend">
              <span>
                <i className="occupied" />
                사용 중 {occupied}
              </span>
              <span>
                <i />빈 좌석 {layout.seats.length - occupied}석
              </span>
            </div>
          </div>
          <div
            className="seating-scroll"
            tabIndex={0}
            role="region"
            aria-label={`${activeRoom}호 좌석 배치도`}
          >
            <div
              className={`seating-room room-${activeRoom}`}
              style={{ width: layout.width, height: layout.height }}
            >
              <div className="seating-room-title">
                <span>{layout.building}관</span>
                <strong>
                  {activeRoom}
                  <small>호</small>
                </strong>
              </div>
              <div className="seating-entrance">
                <DoorOpen size={19} aria-hidden="true" />
                출입구
              </div>
              <RoomPlan layout={layout} />
              {layout.seats.map((seat) => {
                const code = seatNumber(activeRoom, seat.number);
                const student = occupants.get(normalizedSeat(code));
                return (
                  <button
                    key={code}
                    type="button"
                    className={`seating-desk ${student ? "is-occupied" : "is-empty"}`}
                    style={{ left: seat.x, top: seat.y }}
                    aria-label={`${code} ${student ? `${student.name} 정보 수정` : "빈 좌석 학생 추가"}`}
                    title={
                      student
                        ? `${code} · ${student.name}`
                        : `${code} · 학생 추가`
                    }
                    onClick={() => onSelect(student ?? null, code)}
                  >
                    <span className="seating-code">{code}</span>
                    <span className="seating-name">
                      {student?.name ?? "+ 학생 추가"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
