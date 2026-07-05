"use client";

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";

/**
 * Reveal — a lightweight IntersectionObserver wrapper that animates children
 * from opacity:0 + translateY(24px) to visible when scrolled into view.
 *
 * No Framer Motion — pure CSS classes (.reveal / .revealed) + IO.
 *
 * Usage:
 *   <Reveal>content</Reveal>
 *   <Reveal delay={100}>staggered</Reveal>
 *
 * Respects prefers-reduced-motion (the @media rule in globals.css neutralizes
 * transitions, so content is immediately visible).
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const Tag: ElementType = as ?? "div";
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "revealed" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
