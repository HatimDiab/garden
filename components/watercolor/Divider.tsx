export function Divider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <img
        src="/art/divider-long.svg"
        alt=""
        aria-hidden="true"
        className="h-10 w-auto max-w-[42rem] opacity-80"
      />
    </div>
  );
}

export function Sprig({ className = "" }: { className?: string }) {
  return (
    <img
      src="/art/sprig.svg"
      alt=""
      aria-hidden="true"
      className={`h-5 w-auto opacity-80 ${className}`}
    />
  );
}
