export function SkillBar({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg text-lg">
          {icon}
        </span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="text-base font-medium">{label}</p>
        <p className="text-sm text-muted">{value}%</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}
