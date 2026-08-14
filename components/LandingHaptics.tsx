"use client";

import { useEffect, useRef } from "react";
import { useWebHaptics } from "web-haptics/react";

export function LandingHaptics() {
  const { trigger } = useWebHaptics();
  const activeSection = useRef("");
  const lastPulseAt = useRef(0);
  const userInteracted = useRef(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const markInteraction = () => {
      userInteracted.current = true;
    };

    const pulse = () => {
      const now = window.performance.now();
      if (!userInteracted.current || now - lastPulseAt.current < 650) return;
      lastPulseAt.current = now;
      void trigger("selection", { intensity: 0.28 });
    };

    const readActiveSection = () => {
      raf.current = null;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-haptic-section]"));
      const viewportAnchor = window.innerHeight * 0.42;
      const nearest = sections.reduce<HTMLElement | null>((current, section) => {
        if (!current) return section;
        const currentDistance = Math.abs(current.getBoundingClientRect().top - viewportAnchor);
        const sectionDistance = Math.abs(section.getBoundingClientRect().top - viewportAnchor);
        return sectionDistance < currentDistance ? section : current;
      }, null);
      const next = nearest?.dataset.hapticSection || "";
      if (!next || next === activeSection.current) return;
      activeSection.current = next;
      pulse();
    };

    const onScroll = () => {
      if (raf.current !== null) return;
      raf.current = window.requestAnimationFrame(readActiveSection);
    };

    window.addEventListener("touchstart", markInteraction, { passive: true });
    window.addEventListener("wheel", markInteraction, { passive: true });
    window.addEventListener("pointerdown", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction);
    window.addEventListener("scroll", onScroll, { passive: true });
    readActiveSection();

    return () => {
      if (raf.current !== null) window.cancelAnimationFrame(raf.current);
      window.removeEventListener("touchstart", markInteraction);
      window.removeEventListener("wheel", markInteraction);
      window.removeEventListener("pointerdown", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      window.removeEventListener("scroll", onScroll);
    };
  }, [trigger]);

  return null;
}
