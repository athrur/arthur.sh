"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DATASET_PHASES } from "@/content/roulette-data";

const frames = [
  {
    key: "hand",
    src: "/roulette-frame-hand.jpg",
    position: "65% 50%",
    label: "SPIN BOUNDARY",
    detail: "The croupier’s hand helps locate the start and end of a spin. It is not part of the ball trajectory.",
  },
  {
    key: "hidden",
    src: "/roulette-frame-clean.jpg",
    position: "48% 48%",
    label: "BALL HIDDEN",
    detail: "The green zero is visible, but the wheel edge hides the ball. This frame has no measured ball position.",
  },
  {
    key: "tracked",
    src: "/roulette-frame-angle.jpg",
    position: "36% 50%",
    label: "BALL + ZERO",
    detail: "Both reference points are visible. Their centres provide the ball and wheel angles for this frame.",
  },
] as const;

const series = [0.32, 0.47, 0.36, 0.2, 0.41, 0.27, null, null, null, 0.04, 0.3, 0.38, 0.28, 0.43];

function CausalChart() {
  const points = series.map((value, index) => ({
    x: 22 + index * 20,
    y: value === null ? null : 74 - value * 62,
  }));
  const pathFor = (range: typeof points) => range
    .filter((point): point is { x: number; y: number } => point.y !== null)
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const observedPath = `${pathFor(points.slice(0, 6))} ${pathFor(points.slice(9))}`;

  return (
    <svg className="dataset-causal-chart" viewBox="0 0 310 120" role="img" aria-label="Measured ball positions with a short hidden gap estimated from earlier frames">
      <path className="dataset-chart-grid" d="M22 12V84H292M22 30H292M22 56H292" />
      <rect className="dataset-window" x="116" y="12" width="86" height="72" />
      <path className="dataset-observed-series" d={observedPath} />
      <path className="dataset-interpolated-series" d="M122 57L142 62 162 66 182 72 202 55" />
      {points.map((point, index) => point.y === null
        ? <rect className="dataset-missing-point" key={index} x={point.x - 3} y={59 + (index - 6) * 4} width="6" height="6" />
        : <rect className="dataset-observed-point" key={index} x={point.x - 3} y={point.y - 3} width="6" height="6" />)}
      <text x="22" y="106">MEASURED</text><text x="122" y="106">BALL HIDDEN</text><text x="224" y="106">ESTIMATED</text>
    </svg>
  );
}

export function DatasetStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [activeFrame, setActiveFrame] = useState(2);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;
      const available = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, (window.scrollY - section.offsetTop) / available));
      const next = Math.min(DATASET_PHASES.length - 1, Math.round(progress * DATASET_PHASES.length));
      setActiveStage((current) => current === next ? current : next);
      if (progressRef.current) progressRef.current.style.transform = `scaleY(${progress})`;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToStage = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    window.scrollTo({ top: section.offsetTop + index * window.innerHeight, behavior: "smooth" });
  };

  const phase = DATASET_PHASES[activeStage];
  const frame = frames[activeFrame];

  return (
    <section className="dataset-story case-checkpoint-story" id="dataset" ref={sectionRef} aria-labelledby="dataset-title">
      <div className="dataset-sticky page-gutter">
        <aside className="dataset-copy">
          <h2 id="dataset-title">Building the<br />dataset.</h2>
          <p className="dataset-intro">The videos came without labels. Ball and wheel motion had to be recovered frame by frame.</p>
          <ol aria-label="Dataset creation phases">
            {DATASET_PHASES.map((item, index) => (
              <li className={index === activeStage ? "is-active" : index < activeStage ? "is-complete" : ""} key={item.key}>
                <button type="button" onClick={() => scrollToStage(index)} aria-current={index === activeStage ? "step" : undefined}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{item.label}<i />
                </button>
              </li>
            ))}
          </ol>
          <div className="dataset-phase-copy" aria-live="polite"><p>{phase.title}</p><span>{phase.body}</span></div>
          <dl className="dataset-metrics">
            <div><dt>42</dt><dd>videos</dd></div>
            <div><dt>30h 21m</dt><dd>footage</dd></div>
            <div><dt>5.46M</dt><dd>frames</dd></div>
          </dl>
        </aside>

        <div className={`dataset-explorer dataset-stage-${activeStage}`}>
          <header><span>DATASET EXPLORER / {String(activeStage + 1).padStart(2, "0")}</span><strong>{phase.label}</strong></header>
          <div className="dataset-instruction">
            <p>TRACKING EXAMPLES</p>
            <small>Select an image to see what the detector recorded.</small>
          </div>
          <div className="dataset-filmstrip">
            {frames.map((item, index) => (
              <button className={index === activeFrame ? "is-active" : ""} type="button" onClick={() => setActiveFrame(index)} key={item.key} aria-pressed={index === activeFrame} aria-label={`View ${item.label.toLowerCase()} example`}>
                <span>EXAMPLE {String(index + 1).padStart(2, "0")}</span>
                <i><Image src={item.src} alt="" fill sizes="18vw" style={{ objectPosition: item.position }} /></i>
                <b>{item.label}</b>
              </button>
            ))}
          </div>
        </div>

        <aside className="dataset-inspector">
          <header>SELECTED EXAMPLE</header>
          <div className={`dataset-status status-${frame.key}`} aria-live="polite">
            <i /><div><strong>{frame.label}</strong><span>{frame.detail}</span></div>
          </div>
          <CausalChart />
          <dl>
            <div><dt>MANUAL LABELS</dt><dd>100</dd></div>
            <div><dt>VERIFIED</dt><dd>500</dd></div>
            <div><dt>AUGMENTED</dt><dd>3×</dd></div>
            <div><dt>CAUSAL WINDOW</dt><dd>12 frames</dd></div>
          </dl>
          <p>Short missing sections are estimated from earlier positions only. Later frames are not used.</p>
        </aside>

        <div className="case-progress-rail" aria-hidden="true"><span>{Math.round((activeStage / (DATASET_PHASES.length - 1)) * 100)}%</span><i><b ref={progressRef} /></i><span>SCROLL</span></div>
      </div>
      <div className="case-scroll-checkpoints" aria-hidden="true">
        {DATASET_PHASES.map((phase) => <i key={phase.key} />)}
      </div>
    </section>
  );
}
