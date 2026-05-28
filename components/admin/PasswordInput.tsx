"use client";

import { useState } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  showLabel?: string;
  hideLabel?: string;
};

export function PasswordInput({
  className = "field mt-1",
  showLabel = "Show",
  hideLabel = "Hide",
  ...rest
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={`${className} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
        aria-label={visible ? hideLabel : showLabel}
        className="absolute inset-y-0 right-2 my-1 rounded-full px-3 text-xs text-ink-soft transition hover:bg-sage/20 hover:text-moss-deep"
      >
        {visible ? hideLabel : showLabel}
      </button>
    </div>
  );
}
