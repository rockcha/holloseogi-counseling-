import { useState } from "react";
import { DoorOpen } from "lucide-react";
import type { Student } from "@/lib/students";
import { PageHeading } from "./ui/page-heading";
import { Button } from "./ui/button";

type Seat = { number: number; x: number; y: number };
type Room = "1" | "2" | "502" | "503" | "504";
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
const row = (numbers: number[], x: number, y: number, step: number): Seat[] =>
  numbers.map((number, index) => ({ number, x: x + index * step, y }));
const layouts: Record<Room, RoomLayout> = {
  "1": {
    width: 1040,
    height: 760,
    building: 1,
    plan: [
      "M28 112 H210 V74 H270 V112 H470 V176 H560 V122 H650 V182 H748 V112 H1010 V710 H28 Z",
      "M28 112 V710 M210 112 V710 M470 112 V710 M560 112 V710 M650 112 V710 M748 112 V710 M1010 112 V710",
      "M28 196 H210 M28 244 H210 M28 292 H210 M28 340 H210 M28 388 H210 M28 436 H210 M28 484 H210 M28 532 H210",
      "M210 520 H470 M210 604 H470 M470 280 H560 M470 400 H560 M470 520 H560 M650 280 H748 M650 400 H748 M650 520 H748",
      "M748 220 H1010 M748 340 H1010 M748 460 H1010 M748 580 H1010",
    ],
    seats: [
      ...row([38], 120, 72, 1),
      ...row([1, 2, 3], 220, 120, 100),
      ...column([4, 5, 6, 7, 8, 9, 10, 11], 20, 180, 52),
      ...row([12, 13, 14, 15, 16, 17], 220, 650, 88),
      ...column([25, 24, 23, 22, 21, 20, 19, 18], 760, 180, 52),
      ...row([26, 27, 28, 29, 30], 220, 300, 100),
      ...row([31, 32, 33, 34, 35], 220, 430, 100),
      ...row([37, 36], 420, 190, 100),
    ],
  },
  "2": {
    width: 1040,
    height: 760,
    building: 1,
    plan: [
      "M28 112 H210 V74 H270 V112 H470 V176 H560 V122 H650 V182 H748 V112 H1010 V710 H28 Z",
      "M28 112 V710 M210 112 V710 M470 112 V710 M560 112 V710 M650 112 V710 M748 112 V710 M1010 112 V710",
      "M28 220 H210 M28 340 H210 M28 460 H210 M28 580 H210",
      "M210 540 H470 M210 660 H470 M470 280 H560 M470 420 H560 M650 280 H748 M650 420 H748",
      "M748 220 H1010 M748 340 H1010 M748 460 H1010 M748 580 H1010",
    ],
    seats: [
      ...column([5, 6, 7, 8, 9, 10, 11, 12], 40, 180, 52),
      ...row([1, 2, 3, 4], 540, 120, 90),
      ...row([28, 29], 250, 220, 100),
      ...row([31, 30], 250, 340, 100),
      ...row([32, 33], 250, 460, 100),
      ...row([34, 35, 36], 540, 260, 90),
      ...row([39, 38, 37], 540, 420, 90),
      ...column([26, 25, 24, 23, 22, 21, 20], 900, 240, 52),
      ...row([13, 14, 15, 16, 17, 18, 19], 250, 650, 88),
    ],
  },
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
    : `${room === "2" || room === "503" ? "W" : "M"}${String(number).padStart(2, "0")}`;
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
  const selectedBuilding = building;
  const activeRoom =
    selectedBuilding === "1"
      ? room === "1" || room === "2"
        ? room
        : "1"
      : selectedBuilding === "2"
        ? room === "502" || room === "503" || room === "504"
          ? room
          : "502"
        : room;
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
        <div className="flex flex-wrap gap-2">
          {selectedBuilding !== "2" && (
            <label className="seating-select-label">
              1관 자습실
              <select
                aria-label="1관 자습실 선택"
                value={room === "1" || room === "2" ? room : "1"}
                onChange={(event) => setRoom(event.target.value as Room)}
              >
                <option value="1">1호실 · M</option>
                <option value="2">2호실 · W</option>
              </select>
            </label>
          )}
          {selectedBuilding !== "1" && (
            <label className="seating-select-label">
              2관 강의실
              <select
                aria-label="2관 강의실 선택"
                value={
                  room === "502" || room === "503" || room === "504"
                    ? room
                    : "502"
                }
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
      {loading ? (
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
                  <small>{activeRoom === "1" ? "호실" : "호"}</small>
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
