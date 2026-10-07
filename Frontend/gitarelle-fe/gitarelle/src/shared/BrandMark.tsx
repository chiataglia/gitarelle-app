// Logo di Gitarelle (header e schermata di accesso)
export default function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <path d="M4 25 L13 10 L18 18 L21 14 L28 25 Z" fill="var(--bg-2)" />
    </svg>
  );
}
