"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Chapter = { key: string; label: string; title: string; body: string };

// The document scrolls normally. Only the accompanying illustration stays in view.
export function ScrollChapters({ chapters, name, children }: {
  chapters: readonly Chapter[];
  name: string;
  children: (active: number) => ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".scroll-chapter"));
    const scene = root.querySelector<HTMLElement>(".scroll-chapter-scene");
    let frame = 0;
    const update = () => {
      frame = 0;
      const mobile = window.matchMedia("(max-width: 820px)").matches;
      const sceneBottom = scene?.getBoundingClientRect().bottom ?? 0;
      const readingLine = mobile
        ? Math.min(window.innerHeight * 0.86, sceneBottom + (window.innerHeight - sceneBottom) * 0.35)
        : window.innerHeight * 0.52;
      let next = 0;
      cards.forEach((card, index) => {
        const label = card.querySelector(".scroll-chapter-label") ?? card;
        if (label.getBoundingClientRect().top <= readingLine) next = index;
      });
      setActive((current) => current === next ? current : next);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="scroll-chapters" ref={rootRef} data-active-chapter={active}>
      <div className="scroll-chapter-scene">
        <ol className="scroll-chapter-progress" aria-label={`${name} progress`}>
          {chapters.map((chapter, index) => <li key={chapter.key} aria-current={index === active ? "step" : undefined}>
            <span>{String(index + 1).padStart(2, "0")}</span> {chapter.label}
          </li>)}
        </ol>
        <div className="scroll-chapter-visual" key={active}>{children(active)}</div>
      </div>
      <div className="scroll-chapter-text">
        {chapters.map((chapter, index) => <article className="scroll-chapter" id={`${name}-${chapter.key}`} key={chapter.key}>
          <p className="scroll-chapter-label"><span>{String(index + 1).padStart(2, "0")}</span> {chapter.label}</p>
          <h3>{chapter.title}</h3>
          <p>{chapter.body}</p>
        </article>)}
      </div>
    </div>
  );
}
