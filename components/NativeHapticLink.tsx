"use client";

import type { KeyboardEvent, ReactNode } from "react";

type NativeHapticLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  label?: string;
};

export function NativeHapticLink({ href, children, className, label }: NativeHapticLinkProps) {
  const activate = () => {
    triggerStrongFallback();
    window.location.assign(href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  };

  return (
    <span className={`${className || ""} native-haptic-link`} role="link" tabIndex={0} aria-label={label} onKeyDown={onKeyDown}>
      <span className="native-haptic-content">{children}</span>
      <input
        className="native-haptic-switch"
        type="checkbox"
        tabIndex={-1}
        aria-hidden="true"
        onChange={activate}
        {...{ switch: "" }}
      />
    </span>
  );
}

function triggerStrongFallback() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([85, 45, 85]);
}
