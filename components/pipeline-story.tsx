"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ScrollChapters } from "@/components/roulette/scroll-chapters";
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
      <Image src={stage === 0 ? "/roulette-frame-clean.jpg" : "/roulette-frame-angle.jpg"} alt="" fill sizes="(max-width: 820px) 90vw, 24vw" />
      <p>{stage === 0 ? "VIDEO FRAME" : "BALL AND ZERO LABELS"}</p>
    </div>
  );
}

function GeometryTransform({ stage }: { stage: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <svg className="geometry-transform" viewBox="0 0 720 320" role="img" aria-label="Detected elliptical trajectory transformed into a normalised unit circle">
      <defs>
        <marker id="pipeline-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 8 4 0 8Z" />
        </marker>
      </defs>

      <g className={`ellipse-state${stage >= 1 ? " is-visible" : ""}`}>
        <text x="72" y="25">CAMERA VIEW</text>
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
        <text x="490" y="25">NORMALISED VIEW</text>
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
        {RING_POINTS.map((point, index) => <motion.rect className="observed-square" key={index} x={point.x + 357} y={point.y - 3} width="6" height="6" initial={false} animate={{ x: stage >= 2 ? 0 : -360, y: stage >= 2 ? 0 : (150 - point.y) * 0.28 }} transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : index * 0.018 }} />)}
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
  return (
    <section className="roulette-scroll-story page-gutter" id="vision" aria-labelledby="pipeline-title">
      <header className="scroll-story-heading">
        <h2 id="pipeline-title">Making the<br />motion measurable.</h2>
        <p>An angled camera turns a circular track into an ellipse. A hand can hide the ball, and a missed detection can look like a sudden jump. I built a processing pipeline to correct the view, repair short gaps, and extract motion the models could learn from.</p>
      </header>
      <ScrollChapters chapters={PIPELINE_STAGES} name="vision">
        {(active) => <div className={`vision-scroll-scene stage-${active}`}>
          {active < 2 ? <>
            <RawFrame stage={active} />
            <p className="diagram-caption">{active === 0 ? "A frame from the source footage." : "Labels identify the ball and green zero so their centres can be tracked independently."}</p>
          </> : active === 2 ? <>
            <GeometryTransform stage={active} />
            <p className="diagram-caption">The angled camera view is mapped onto a circle. Illustration of the geometry correction.</p>
          </> : <>
            <TrajectoryReadout stage={active} />
            <p className="diagram-caption">Position becomes angle, radius, and speed. The inward change in radius identifies drop-off, marked t*. Illustrative signals.</p>
          </>}
        </div>}
      </ScrollChapters>
    </section>
  );
}
