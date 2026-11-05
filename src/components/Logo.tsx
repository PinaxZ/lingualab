export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime shadow-sm">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21c.8-3.2 2-5.4 4.8-8.1C19.6 10.3 20 8.4 20 6.8 20 4.5 18.4 3 16.2 3c-1.5 0-2.7.7-3.4 1.8h-.6C11.5 3.7 10.3 3 8.8 3 6.6 3 5 4.5 5 6.8c0 1.6.4 3.5 3.2 6.1C11 15.6 12.2 17.8 13 21Z"
            fill="#1b2b1c"
          />
          <path d="M8 13.5c2.2.4 3.8 1.6 4.8 3.5" stroke="#5eb3f6" strokeWidth="1.4" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">
            LinguaLab
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Aprende viviendo
          </span>
        </span>
      )}
    </div>
  );
}
