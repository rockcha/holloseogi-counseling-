export type DashboardSort = "seat" | "oldest";

export function DashboardSortControl({ label, value, onChange }: {
  label: string;
  value: DashboardSort;
  onChange: (value: DashboardSort) => void;
}) {
  return <div role="group" aria-label={`${label} 정렬`} className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 mb-2">
    {([{ value: "seat", label: "좌석순" }, { value: "oldest", label: "오래된 순" }] as const).map(option =>
      <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}
        className={`rounded-md px-2 py-1.5 text-xs ${value === option.value ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}>
        {option.label}
      </button>)}
  </div>;
}
