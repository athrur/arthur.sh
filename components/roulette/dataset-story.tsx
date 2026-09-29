"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const frames = [
  {
    key: "hand",
    src: "/roulette-frame-hand.jpg",
    label: "Dealer’s hand",
    detail: "The dealer’s hand gives us a way to separate one spin from the next. Tracking it helps identify spin boundaries.",
  },
  {
    key: "blurred",
    src: "/roulette-frame-clean.jpg",
    label: "Motion blur",
    detail: "The ball is visible as a blurred streak along the right-hand rim. Its speed spreads it across the frame, making its centre harder to locate precisely.",
  },
  {
    key: "tracked",
    src: "/roulette-frame-angle.jpg",
    label: "Ball and zero",
    detail: "Here the ball and green zero are both visible. Their labelled centres let us follow the ball’s position and the wheel’s rotation independently.",
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
      <path className="dataset-interpolated-series" d={`M122 ${74 - 0.27 * 62}L142 62 162 66 182 70L202 ${74 - 0.04 * 62}`} />
      {points.map((point, index) => point.y === null
        ? <rect className="dataset-missing-point" key={index} x={point.x - 3} y={59 + (index - 6) * 4} width="6" height="6" />
        : <rect className="dataset-observed-point" key={index} x={point.x - 3} y={point.y - 3} width="6" height="6" />)}
      <text x="22" y="106">MEASURED</text><text x="125" y="106">ESTIMATED</text><text x="226" y="106">MEASURED</text>
    </svg>
  );
}

export function DatasetStory() {
  const reduceMotion = useReducedMotion();
  const [activeFrame, setActiveFrame] = useState(2);

  const frame = frames[activeFrame];

  return (
    <motion.section initial={false} whileInView={reduceMotion ? undefined : { opacity: [0.55, 1], y: [16, 0] }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: 0.45 }} className="dataset-story case-checkpoint-story" id="dataset" aria-labelledby="dataset-title">
      <div className="dataset-sticky page-gutter">
        <aside className="dataset-copy">
          <h2 id="dataset-title">First, I needed<br />the data.</h2>
          <p className="dataset-intro">The videos showed the spins, but none of the measurements I needed. Before I could train a forecasting model, I had to turn the footage into reliable records of where the ball and wheel were in each frame.</p>
          <p className="dataset-intro">I collected 40 hours of footage across 42 videos, prepared the frames, and built a set of 500 checked examples to train the detector. After tracking and quality filtering, 2,765 spins were ready for modelling.</p>
          <dl className="dataset-metrics">
            <div><dt>42</dt><dd>videos</dd></div>
            <div><dt>40 hours</dt><dd>footage</dd></div>
            <div><dt>2,765</dt><dd>usable spins</dd></div>
          </dl>
        </aside>

        <div className="dataset-explorer">

          <div className="dataset-instruction">
            <p>What the camera sees</p>
            <small>Choose a frame to inspect its labels.</small>
          </div>
          <motion.figure key={frame.key} className="dataset-selected-frame" initial={reduceMotion ? false : { opacity: 0.5, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}><div><Image src={frame.src} alt={frame.detail} fill sizes="(max-width: 820px) 90vw, 45vw" /></div><figcaption>{frame.detail}</figcaption></motion.figure>
          <div className="dataset-filmstrip">
            {frames.map((item, index) => (
              <button className={index === activeFrame ? "is-active" : ""} type="button" onClick={() => setActiveFrame(index)} key={item.key} aria-pressed={index === activeFrame} aria-label={`View ${item.label.toLowerCase()} example`}>
                <span>EXAMPLE {String(index + 1).padStart(2, "0")}</span>
                <i><Image src={item.src} alt="" fill sizes="(max-width: 820px) 28vw, 15vw" /></i>
                <b>{item.label}</b>
              </button>
            ))}
          </div>
        </div>

        <aside className="dataset-inspector">
          <header>READING THE FRAME</header>
          <div className={`dataset-status status-${frame.key}`} aria-live="polite">
            <i /><div><strong>{frame.label}</strong><span>{frame.detail}</span></div>
          </div>
          <p className="diagram-caption">When a detection is missing</p>
          <CausalChart />
          <dl>
            <div><dt>HAND-LABELLED</dt><dd>100</dd></div>
            <div><dt>CHECKED FRAMES</dt><dd>500</dd></div>
            <div><dt>DATA AUGMENTATION</dt><dd>3×</dd></div>
            <div><dt>PREVIOUS POSITIONS</dt><dd>12 frames</dd></div>
          </dl>
          <p>The diagram illustrates a brief occlusion. Missing positions are estimated from the preceding 12 frames, so the estimate never relies on seeing what happens next.</p>
        </aside>

      </div>
    </motion.section>
  );
}
