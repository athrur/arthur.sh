"use client";

import Image from "next/image";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PIPELINE_STAGES } from "@/content/roulette-data";

const RING_POINTS = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 23) * Math.PI * 1.45 + Math.PI * 0.77;
  const jitter = Math.sin(index * 2.31) * 3;
  return {
    x: Number((180 + Math.cos(angle) * (102 + jitter)).toFixed(2)),
    y: Number((150 + Math.sin(angle) * (102 + jitter)).toFixed(2)),
  };
});

const CHART_POINTS = Array.from({ length: 64 }, (_, index) => {
  const x = 18 + (index / 63) * 704;
  const clean = Math.sin(index * 0.39) * 8 + Math.sin(index * 0.11) * 14;
  const raw = clean + Math.sin(index * 2.71) * 12 * (index % 9 === 0 ? 1.5 : 0.35);
  return {
    x: Number(x.toFixed(2)),
    cleanY: Number((64 + clean).toFixed(2)),
    rawY: Number((64 + raw).toFixed(2)),
    radiusY: Number((140 + Math.sin(index * 0.18) * 4 - Math.max(0, index - 51) * 1.8).toFixed(2)),
  };
});

function pointsToPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

function stableCoordinate(value: number) {
  return Number(value.toFixed(3));
}

function RawFrame({ stage }: { stage: number }) {
  return (
    <div className="pipeline-frame" aria-hidden="true">
      <Image src="/roulette-frame-angle.jpg" alt="" fill sizes="32vw" />
      <div className={`segmentation-overlay${stage >= 1 ? " is-visible" : ""}`}>
        <span className="seg-ball" />
        <span className="seg-zero" />
        <svg viewBox="0 0 320 300">
          <path d="M38 142C72 63 174 21 260 78C312 114 304 208 244 254C171 310 67 258 38 184Z" />
          <path d="M178 102 191 96 202 103 201 117 187 122 176 114Z" />
          <path d="M84 177 92 169 102 175 100 188 89 191Z" />
        </svg>
      </div>
      <div className="scan-line" />
      <p>{stage === 0 ? "RAW / OBLIQUE FRAME" : "YOLOv11 / POLYGON CENTROIDS"}</p>
    </div>
  );
}

function GeometryTransform({ stage }: { stage: number }) {
  return (
    <svg className="geometry-transform" viewBox="0 0 720 320" role="img" aria-label="Detected elliptical trajectory transformed into a normalised unit circle">
      <defs>
        <marker id="pipeline-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 8 4 0 8Z" />
        </marker>
      </defs>

      <g className={`ellipse-state${stage >= 1 ? " is-visible" : ""}`}>
        <text x="72" y="25">DETECTED ELLIPSE</text>
        <ellipse cx="180" cy="150" rx="132" ry="92" />
        <ellipse cx="180" cy="150" rx="114" ry="78" className="geometry-dashed" />
        <path d="M35 150H325M180 39V261" className="geometry-axis" />
        {RING_POINTS.map((point, index) => (
          <g key={index}>
            <rect x={point.x - 3} y={(150 + (point.y - 150) * 0.72) - 3} width="6" height="6" />
            {index % 4 === 0 ? <path className="correspondence" d={`M${point.x} ${150 + (point.y - 150) * 0.72}L${point.x + 360} ${point.y}`} /> : null}
          </g>
        ))}
      </g>

      <path className={`transform-arrow${stage >= 2 ? " is-visible" : ""}`} d="M332 150H383" markerEnd="url(#pipeline-arrow)" />
      <text className={`homography-label${stage >= 2 ? " is-visible" : ""}`} x="344" y="135">H</text>

      <g className={`circle-state${stage >= 2 ? " is-visible" : ""}`}>
        <text x="490" y="25">TOP-DOWN UNIT CIRCLE</text>
        <circle cx="540" cy="150" r="118" />
        <circle cx="540" cy="150" r="96" className="geometry-dashed" />
        <circle cx="540" cy="150" r="45" className="geometry-dashed" />
        <path d="M402 150H678M540 18V282" className="geometry-axis" />
        {Array.from({ length: 12 }, (_, index) => {
          const angle = (index / 12) * Math.PI * 2;
          const innerX = stableCoordinate(540 + Math.cos(angle) * 96);
          const innerY = stableCoordinate(150 + Math.sin(angle) * 96);
          const outerX = stableCoordinate(540 + Math.cos(angle) * 118);
          const outerY = stableCoordinate(150 + Math.sin(angle) * 118);
          return <path key={index} d={`M${innerX} ${innerY}L${outerX} ${outerY}`} />;
        })}
        <path className="normalised-trace" d={pointsToPath(RING_POINTS.map((point) => ({ x: point.x + 360, y: point.y })))} />
        {RING_POINTS.map((point, index) => <rect className={index < 12 ? "observed-square" : "predicted-square"} key={index} x={point.x + 357} y={point.y - 3} width="6" height="6" />)}
      </g>
    </svg>
  );
}

function TrajectoryReadout({ stage }: { stage: number }) {
  const rawPath = pointsToPath(CHART_POINTS.map((point) => ({ x: point.x, y: point.rawY })));
  const cleanPath = pointsToPath(CHART_POINTS.map((point) => ({ x: point.x, y: point.cleanY })));
  const radiusPath = pointsToPath(CHART_POINTS.map((point) => ({ x: point.x, y: point.radiusY })));

  return (
    <svg className={`pipeline-charts${stage >= 2 ? " is-visible" : ""}`} viewBox="0 0 740 180" role="img" aria-label="Raw and cleaned angular and radial trajectories">
      <path className="chart-rule" d="M18 20H722M18 92H722M18 108H722M18 162H722" />
      <path className="chart-rule dashed" d="M18 56H722M18 135H722" />
      <text x="18" y="13">ANGLE θ (rad)</text>
      <text x="18" y="103">RADIUS r (unit)</text>
      <path className={`raw-series${stage >= 3 ? " is-muted" : ""}`} d={rawPath} />
      <path className="clean-series" d={cleanPath} />
      <path className="radius-series" d={radiusPath} />
      <path className={`drop-line${stage >= 3 ? " is-visible" : ""}`} d="M588 16V166" />
      <text className={`drop-label${stage >= 3 ? " is-visible" : ""}`} x="596" y="32">t*</text>
      <text x="18" y="177">0s</text>
      <text x="354" y="177">5s</text>
      <text x="700" y="177">10s</text>
    </svg>
  );
}

export function PipelineStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      if (!section) return;
      const available = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, (window.scrollY - section.offsetTop) / available));
      const nextStage = Math.min(PIPELINE_STAGES.length - 1, Math.round(progress * PIPELINE_STAGES.length));
      setActiveStage((current) => (current === nextStage ? current : nextStage));
      if (progressRef.current) progressRef.current.style.transform = `scaleY(${progress})`;
    };

    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const scrollToStage = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    window.scrollTo({
      top: section.offsetTop + index * window.innerHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const stage = PIPELINE_STAGES[activeStage];

  return (
    <section className="pipeline-story" id="vision" ref={sectionRef} aria-labelledby="pipeline-title">
      <div className="pipeline-sticky page-gutter">
        <div className="pipeline-copy">
          <h2 id="pipeline-title">Recovering<br />the motion.</h2>
          <p className="pipeline-lede">Each camera view has to become a clean, comparable trajectory before it can be used for prediction.</p>

          <ol className="pipeline-steps" aria-label="Research pipeline stages">
            {PIPELINE_STAGES.map((item, index) => (
              <li className={index === activeStage ? "is-active" : index < activeStage ? "is-complete" : ""} key={item.key}>
                <button type="button" onClick={() => scrollToStage(index)} aria-current={index === activeStage ? "step" : undefined}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                  <i aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>

          <div className="pipeline-stage-copy" aria-live="polite">
            <p>{stage.title}</p>
            <span>{stage.body}</span>
          </div>

          <dl className="pipeline-facts">
            <div><dt>42</dt><dd>videos</dd></div>
            <div><dt>5,463,775</dt><dd>frames</dd></div>
            <div><dt>1.36 px</dt><dd>centroid error</dd></div>
          </dl>
        </div>

        <div className={`pipeline-visual stage-${activeStage}`}>
          <div className="pipeline-visual-head">
            <span>PIPELINE / {String(activeStage + 1).padStart(2, "0")}</span>
            <span>{stage.label}</span>
          </div>
          <div className="pipeline-visual-grid">
            <RawFrame stage={activeStage} />
            <GeometryTransform stage={activeStage} />
          </div>
          <TrajectoryReadout stage={activeStage} />
          <div className={`forecast-readout${activeStage === 3 ? " is-visible" : ""}`}>
            <span>TRACK</span>
            <i />
            <span>SMOOTH</span>
            <i />
            <span>DERIVE</span>
            <output>θ + r + θ̇ + ṙ + t*</output>
          </div>
        </div>

        <div className="pipeline-scroll-progress" aria-hidden="true">
          <span>{Math.round((activeStage / 3) * 100)}%</span>
          <i><b ref={progressRef} /></i>
          <span>SCROLL</span>
        </div>
      </div>
      <div className="case-scroll-checkpoints" aria-hidden="true">
        {PIPELINE_STAGES.map((stage) => <i key={stage.key} />)}
      </div>
    </section>
  );
}
