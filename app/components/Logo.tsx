/**
 * The wordmark. `tone="light"` swaps in the variant whose black letters are
 * white — the default one disappears against a dark background, while the
 * red and yellow are identical in both files.
 */
export function Logo({
  className = "",
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={`inline-flex items-center select-none leading-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tone === "light" ? "/bewerbify-logo-light.png" : "/bewerbify-logo.png"}
        alt="Bewerbify"
        style={{ height: "1em", width: "auto" }}
      />
    </span>
  );
}
