export function Bloom({
  size = 240,
  className = "",
  drift = true,
}: {
  size?: number;
  className?: string;
  drift?: boolean;
}) {
  return (
    <img
      src="/art/bloom.svg"
      alt=""
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={`${drift ? "drift" : ""} ${className}`}
    />
  );
}

export function CornerVine({
  position = "tl",
  className = "",
}: {
  position?: "tl" | "tr" | "bl" | "br";
  className?: string;
}) {
  const map: Record<string, string> = {
    tl: "top-0 left-0",
    tr: "top-0 right-0 scale-x-[-1]",
    bl: "bottom-0 left-0 scale-y-[-1]",
    br: "bottom-0 right-0 scale-[-1]",
  };
  return (
    <img
      src="/art/corner-vine.svg"
      alt=""
      aria-hidden="true"
      className={`pointer-events-none absolute ${map[position]} h-60 w-60 opacity-50 ${className}`}
    />
  );
}
