"use client";

import { motion, useReducedMotion } from "motion/react";
import { RESEARCH_CHAPTERS } from "@/content/roulette-data";
import { site } from "@/content/site";

const tickPaths = Array.from({ length: 48 }, (_, index) => {
  const angle = (index / 48) * Math.PI * 2;
  const inner = { x: 360 + Math.cos(angle) * 244, y: 330 + Math.sin(angle) * 244 };
  const outer = { x: 360 + Math.cos(angle) * (index % 4 === 0 ? 258 : 252), y: 330 + Math.sin(angle) * (index % 4 === 0 ? 258 : 252) };
  return `M${inner.x.toFixed(2)} ${inner.y.toFixed(2)}L${outer.x.toFixed(2)} ${outer.y.toFixed(2)}`;
});

const HERO_BALL_PATH = "M184 402A190 190 0 0 1 425 151C517 173 558 260 540 351";
const OBSERVED_START_ANGLE = 2.753;
const OBSERVED_END_ANGLE = 5.061;

const observed = Array.from({ length: 18 }, (_, index) => {
  const angle = OBSERVED_START_ANGLE + (index / 17) * (OBSERVED_END_ANGLE - OBSERVED_START_ANGLE);
  return { x: 360 + Math.cos(angle) * 190, y: 330 + Math.sin(angle) * 190 };
});

export function RouletteHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="roulette-hero page-gutter case-snap-section"
      id="overview"
      aria-labelledby="roulette-title"
    >
      <div className="roulette-hero-copy">
        <h1 id="roulette-title">Predicting roulette<br />from video.</h1>
        <div>
          <p>Roulette is deterministic, but small differences at the start of a spin compound quickly.</p>
          <p>The project recovers that motion from video, then tests how far ahead it can be forecast.</p>
        </div>
        <a className="roulette-primary-link" href={site.project.pdf} target="_blank" rel="noreferrer">Read the paper <span aria-hidden="true">↗</span></a>
      </div>

      <div className="roulette-hero-instrument" aria-hidden="true">
        <p>Six seconds observed. The model forecasts the path to t*.</p>
        <svg viewBox="0 0 720 660">
          <g className="hero-wheel-rings">
            <circle cx="360" cy="330" r="258" />
            <circle cx="360" cy="330" r="230" />
            <circle cx="360" cy="330" r="206" />
            <circle cx="360" cy="330" r="190" />
            <circle cx="360" cy="330" r="132" />
            <circle cx="360" cy="330" r="50" />
            {tickPaths.map((path, index) => <path d={path} key={index} />)}
          </g>
          <motion.path
            className="hero-observed-arc"
            d="M184 402A190 190 0 0 1 425 151"
            initial={false}
            animate={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 0, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
            transition={{ duration: 6, times: [0, 0.08, 0.44, 0.92, 1], repeat: reduceMotion ? 0 : Infinity, ease: "linear" }}
          />
          <motion.path
            className="hero-forecast-arc"
            d="M425 151C517 173 558 260 540 351"
            initial={false}
            animate={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: [0, 0, 0, 1, 1, 0], opacity: [0, 0, 1, 1, 1, 0] }}
            transition={{ duration: 6, times: [0, 0.44, 0.5, 0.86, 0.94, 1], repeat: reduceMotion ? 0 : Infinity, ease: "linear" }}
          />
          {observed.map((point, index) => <rect key={index} x={point.x - 4} y={point.y - 4} width="8" height="8" />)}
          {reduceMotion ? <circle className="hero-ball" cx="425" cy="151" r="8" /> : (
            <circle className="hero-ball" r="8">
              <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" keyPoints="0;0;0.63;1;1;0" keyTimes="0;0.08;0.44;0.86;0.94;1" path={HERO_BALL_PATH} />
              <animate attributeName="opacity" dur="6s" repeatCount="indefinite" calcMode="linear" values="0;1;1;1;0;0" keyTimes="0;0.08;0.86;0.92;0.94;1" />
            </circle>
          )}
          <path className="hero-vector" d="M425 151 493 205" />
          <path className="hero-cross" d="M345 330h30M360 315v30" />
          <text className="hero-phase-label is-observed" x="186" y="438">OBSERVED · 0–6s</text>
          <text className="hero-phase-label is-forecast" x="500" y="388">FORECAST · 6s–t*</text>
        </svg>
        <dl>
          <div><dt>OBSERVED</dt><dd>6.0 s</dd></div>
          <div><dt>BALL MAE</dt><dd>0.185 rad</dd></div>
          <div><dt>TARGET</dt><dd>t*</dd></div>
        </dl>
      </div>

      <ol className="roulette-chapter-rail" aria-label="Research chapters">
        {RESEARCH_CHAPTERS.map((chapter, index) => (
          <li className={index === 0 ? "is-active" : ""} key={chapter.number}>
            <a href={chapter.href}><span>{chapter.number}</span><b>{chapter.label}</b><small>{chapter.detail}</small><i /></a>
          </li>
        ))}
      </ol>
      <p className="hero-scroll-cue" aria-hidden="true">PROJECT OVERVIEW <span>↓</span></p>
    </section>
  );
}
