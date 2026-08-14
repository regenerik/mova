"use client";

import type { KeyboardEvent, ReactNode } from "react";

type NativeHapticLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  label?: string;
  target?: "_blank" | "_self";
};

export function NativeHapticLink({ href, children, className, label, target = "_self" }: NativeHapticLinkProps) {
  const activate = () => {
    if (target === "_blank") {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
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
