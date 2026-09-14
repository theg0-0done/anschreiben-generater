export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-modak tracking-wide select-none leading-none inline-flex ${className}`}
      style={{ WebkitTextStroke: "0.05em #fff", paintOrder: "stroke fill" }}
    >
      <span style={{ color: "#111111" }}>Bew</span>
      <span style={{ color: "#e11d2e" }}>erb</span>
      <span style={{ color: "#f5b400" }}>ify</span>
    </span>
  );
}
