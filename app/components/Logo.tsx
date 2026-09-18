export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center select-none leading-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bewerbify-logo.png" alt="Bewerbify" style={{ height: "1em", width: "auto" }} />
    </span>
  );
}
