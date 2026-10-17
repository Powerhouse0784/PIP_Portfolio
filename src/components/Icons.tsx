export function Star({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m12 1 3 8h8l-6.5 5 2.5 8-7-5-7 5 2.5-8L1 9h8z" />
    </svg>
  );
}
