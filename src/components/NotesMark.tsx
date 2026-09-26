export function NotesMark({ size = 46, className }: { size?: number; className?: string }) {
  const ink = 'var(--accent-ink)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className ? `shrink-0 ${className}` : 'shrink-0'}
    >
      <rect width="48" height="48" rx="11" fill="var(--accent)" />
      <rect x="15" y="6" width="18" height="6" rx="3" fill={ink} opacity="0.3" />
      <rect x="12" y="11" width="24" height="6" rx="3" fill={ink} opacity="0.55" />
      <path
        fill={ink}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5 16h23a3.5 3.5 0 0 1 3.5 3.5v19a3.5 3.5 0 0 1-3.5 3.5h-23A3.5 3.5 0 0 1 9 38.5v-19a3.5 3.5 0 0 1 3.5-3.5ZM14 23h20a1.6 1.6 0 0 1 0 3.2H14a1.6 1.6 0 0 1 0-3.2Zm0 6.5h20a1.6 1.6 0 0 1 0 3.2H14a1.6 1.6 0 0 1 0-3.2Zm0 6.5h11a1.6 1.6 0 0 1 0 3.2H14a1.6 1.6 0 0 1 0-3.2Z"
      />
    </svg>
  );
}
