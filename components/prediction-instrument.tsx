"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ChaosField } from "@/components/chaos-field";

const MIN_SECONDS = 2;
const MAX_SECONDS = 10;
const START_ANGLE = -154;
const DROP_ANGLE = 24;

type Point = { x: number; y: number };

function polarPoint(cx: number, cy: number, radius: number, angle: number): Point {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: Number((cx + radius * Math.cos(radians)).toFixed(3)),
    y: Number((cy + radius * Math.sin(radians)).toFixed(3)),
  };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarPoint(cx, cy, radius, endAngle);
  const end = polarPoint(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function uncertaintyPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const outer: Point[] = [];
  const inner: Point[] = [];
  const steps = 16;

  for (let index = 0; index <= steps; index += 1) {
    const progress = index / steps;
    const angle = startAngle + (endAngle - startAngle) * progress;
    const spread = 2 + progress * 34;
    outer.push(polarPoint(cx, cy, radius + spread, angle));
    inner.unshift(polarPoint(cx, cy, radius - spread, angle));
  }

  const points = [...outer, ...inner];
  return `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`;
}

function limitVector(vector: Point, limit = 112): Point {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= limit) return vector;
  return { x: (vector.x / length) * limit, y: (vector.y / length) * limit };
}

function bentPredictionPath(start: Point, end: Point, disturbance: Point) {
  const controlA = {
    x: start.x + 82 + disturbance.x * 0.72,
    y: start.y - 72 + disturbance.y * 0.55,
  };
  const controlB = {
    x: end.x - 86 + disturbance.x * 0.22,
    y: end.y - 48 + disturbance.y * 0.18,
  };
  return `M ${start.x} ${start.y} C ${controlA.x} ${controlA.y} ${controlB.x} ${controlB.y} ${end.x} ${end.y}`;
}

function bentPredictionPoint(start: Point, end: Point, disturbance: Point, progress: number): Point {
  const controlA = {
    x: start.x + 82 + disturbance.x * 0.72,
    y: start.y - 72 + disturbance.y * 0.55,
  };
  const controlB = {
    x: end.x - 86 + disturbance.x * 0.22,
    y: end.y - 48 + disturbance.y * 0.18,
  };
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * progress * controlA.x + 3 * inverse * progress ** 2 * controlB.x + progress ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * progress * controlA.y + 3 * inverse * progress ** 2 * controlB.y + progress ** 3 * end.y,
  };
}

function PlayPauseIcon({ playing }: { playing: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      {playing ? (
        <>
          <path d="M8 6v12" />
          <path d="M16 6v12" />
        </>
      ) : (
        <path d="m9 6 9 6-9 6V6Z" />
      )}
    </svg>
  );
}

function TrackingPanel({ ball }: { ball: Point }) {
  return (
    <div className="tracking-panel instrument-panel">
      <p>TRACKING</p>
      <div className="tracking-image">
        <Image src="/roulette-frame-angle.jpg" alt="Roulette footage with object segmentation overlays" fill sizes="150px" />
        <span style={{ left: `${42 + (ball.x / 760) * 22}%`, top: `${28 + (ball.y / 620) * 18}%` }} />
      </div>
      <code>frame 3,423,781</code>
      <code>(x,y): 412, 378</code>
    </div>
  );
}

function ConfidencePanel({ seconds }: { seconds: number }) {
  const marker = 20 + ((seconds - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS)) * 126;

  return (
    <div className="confidence-panel instrument-panel">
      <p>CONFIDENCE</p>
      <svg viewBox="0 0 166 112" role="img" aria-label="Model confidence falls as the trajectory approaches drop-off">
        <path className="chart-grid" d="M20 10V90H154M20 50H154M20 10H154" />
        <path className="chart-line" d="M20 22 31 19 41 23 54 18 68 21 81 19 95 25 108 24 118 30 127 42 136 60 145 84 154 89" />
        <path className="chart-marker" d={`M${marker} 10V90`} />
        <text x="2" y="14">1.0</text>
        <text x="2" y="54">0.5</text>
        <text x="2" y="94">0.0</text>
        <text x="17" y="108">0s</text>
        <text x="86" y="108">5s</text>
        <text x="142" y="108">10s</text>
      </svg>
      <code>model confidence</code>
    </div>
  );
}

export function PredictionInstrument() {
  const reduceMotion = useReducedMotion();
  const [seconds, setSeconds] = useState(6);
  const [playing, setPlaying] = useState(true);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [disturbance, setDisturbance] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [releaseId, setReleaseId] = useState(0);
  const [releaseOrigin, setReleaseOrigin] = useState<Point>({ x: 380, y: 300 });
  const [instrumentVisible, setInstrumentVisible] = useState(false);
  const instrumentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = instrumentRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setInstrumentVisible(entry.isIntersecting), {
      rootMargin: "120px",
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || reduceMotion || !instrumentVisible || dragging) return;

    const interval = window.setInterval(() => {
      setSeconds((current) => (current >= MAX_SECONDS ? MIN_SECONDS : Number((current + 0.1).toFixed(1))));
    }, 140);

    return () => window.clearInterval(interval);
  }, [dragging, instrumentVisible, playing, reduceMotion]);

  const observedEnd = START_ANGLE + ((seconds - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS)) * 126;
  const ball = polarPoint(380, 300, 188, observedEnd);
  const draggedBall = { x: ball.x + disturbance.x, y: ball.y + disturbance.y };
  const dropPoint = polarPoint(380, 300, 188, DROP_ANGLE);
  const disturbanceMagnitude = Math.hypot(disturbance.x, disturbance.y);
  const deltaTheta = disturbance.x / 190 + disturbance.y / 300;
  const confidence = Math.max(34, Math.min(96, Math.round(52 + seconds * 4 - disturbanceMagnitude * 0.25)));

  const observedPoints = useMemo(
    () => Array.from({ length: 10 }, (_, index) => polarPoint(380, 300, 188, START_ANGLE + ((observedEnd - START_ANGLE) * index) / 9)),
    [observedEnd],
  );
  const predictedPoints = Array.from({ length: 8 }, (_, index) =>
    bentPredictionPoint(draggedBall, dropPoint, disturbance, index / 7),
  );

  return (
    <div className="prediction-instrument" ref={instrumentRef}>
      <div className="live-telemetry" aria-hidden="true">
        <output>Δθ <span>{deltaTheta >= 0 ? "+" : ""}{deltaTheta.toFixed(2)} rad</span></output>
        <output>confidence <span>{confidence}%</span></output>
      </div>
      <div className="phase-labels" aria-hidden="true">
        <span>OBSERVED</span>
        <span>PREDICTED</span>
        <span>DROP-OFF</span>
      </div>

      <div className="instrument-stage">
        <div
          className={`wheel-wrap${dragging ? " is-dragging" : ""}`}
          tabIndex={0}
          aria-label="Interactive trajectory simulation. Drag the tracked ball to disturb the forecast. Use arrow keys to perturb it, and Escape to reset."
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const point = {
              x: ((event.clientX - rect.left) / rect.width) * 760,
              y: ((event.clientY - rect.top) / rect.height) * 620,
            };
            setCursor(point);
            if (dragging) setDisturbance(limitVector({ x: point.x - ball.x, y: point.y - ball.y }));
          }}
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const point = {
              x: ((event.clientX - rect.left) / rect.width) * 760,
              y: ((event.clientY - rect.top) / rect.height) * 620,
            };
            if (Math.hypot(point.x - draggedBall.x, point.y - draggedBall.y) > 52) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setPlaying(false);
            setDragging(true);
            setCursor(point);
          }}
          onPointerUp={(event) => {
            if (!dragging) return;
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
            setReleaseOrigin(draggedBall);
            setReleaseId((current) => current + 1);
            setDragging(false);
          }}
          onPointerCancel={() => setDragging(false)}
          onPointerLeave={() => {
            if (!dragging) setCursor(null);
          }}
          onKeyDown={(event) => {
            const increments: Record<string, Point> = {
              ArrowLeft: { x: -10, y: 0 },
              ArrowRight: { x: 10, y: 0 },
              ArrowUp: { x: 0, y: -10 },
              ArrowDown: { x: 0, y: 10 },
            };
            const increment = increments[event.key];
            if (increment) {
              event.preventDefault();
              setPlaying(false);
              setDisturbance((current) => limitVector({ x: current.x + increment.x, y: current.y + increment.y }));
            }
            if (event.key === "Escape") {
              setDisturbance({ x: 0, y: 0 });
              setReleaseOrigin(ball);
              setReleaseId((current) => current + 1);
            }
          }}
        >
          <ChaosField
            start={draggedBall}
            end={dropPoint}
            disturbance={disturbance}
            cursor={cursor}
            releaseId={releaseId}
            releaseOrigin={releaseOrigin}
            reducedMotion={Boolean(reduceMotion)}
          />
          <svg
            className="wheel-visual"
            viewBox="0 0 760 620"
            role="img"
            aria-label={`${seconds.toFixed(1)} seconds of observed ball motion followed by a predicted trajectory and uncertainty toward drop-off`}
          >
            <defs>
              <radialGradient id="wheel-fade">
                <stop offset="0" stopColor="#14181b" stopOpacity="0" />
                <stop offset="1" stopColor="#090b0c" stopOpacity="0.84" />
              </radialGradient>
              <linearGradient id="uncertainty" x1="0" x2="1">
                <stop offset="0" stopColor="#a9bfff" stopOpacity="0.02" />
                <stop offset="1" stopColor="#a9bfff" stopOpacity="0.32" />
              </linearGradient>
              <filter id="ball-glow" x="-300%" y="-300%" width="600%" height="600%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <marker id="velocity-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0 0 8 4 0 8Z" />
              </marker>
            </defs>

            <g className="wheel-rings" style={{ transform: `rotate(${seconds * 1.5}deg)`, transformOrigin: "380px 300px" }}>
              <circle cx="380" cy="300" r="252" />
              <circle cx="380" cy="300" r="228" />
              <circle cx="380" cy="300" r="198" />
              <circle cx="380" cy="300" r="142" />
              <circle cx="380" cy="300" r="108" className="dashed-ring" />
              <circle cx="380" cy="300" r="34" />
              {Array.from({ length: 37 }, (_, index) => {
                const angle = (index / 37) * 360;
                const inner = polarPoint(380, 300, 198, angle);
                const outer = polarPoint(380, 300, 228, angle);
                return <path key={index} d={`M${inner.x} ${inner.y}L${outer.x} ${outer.y}`} />;
              })}
              {Array.from({ length: 8 }, (_, index) => {
                const angle = index * 45 + 22.5;
                const point = polarPoint(380, 300, 239, angle);
                return <rect key={index} x={point.x - 4} y={point.y - 4} width="8" height="8" transform={`rotate(${angle} ${point.x} ${point.y})`} />;
              })}
            </g>

            <path className="uncertainty" d={uncertaintyPath(380, 300, 188, observedEnd, DROP_ANGLE)} />
            <path className="trajectory trajectory-observed" d={arcPath(380, 300, 188, START_ANGLE, observedEnd)} />
            <path className="trajectory trajectory-predicted" d={bentPredictionPath(draggedBall, dropPoint, disturbance)} />

            {observedPoints.map((point, index) => (
              <g key={`observed-${index}`}>
                <circle className="trajectory-point observed-point" cx={point.x} cy={point.y} r={index === 9 ? 5 : 3.5} />
                <rect className="centroid-box" x={point.x - 9} y={point.y - 9} width="18" height="18" />
              </g>
            ))}
            {predictedPoints.slice(1).map((point, index) => (
              <circle className="trajectory-point predicted-point" key={`predicted-${index}`} cx={point.x} cy={point.y} r="3" />
            ))}

            <circle
              className={`ball${reduceMotion ? "" : " is-pulsing"}`}
              cx={draggedBall.x}
              cy={draggedBall.y}
              r="8"
              filter="url(#ball-glow)"
            />
            <circle className="ball-handle" cx={draggedBall.x} cy={draggedBall.y} r={dragging ? 30 : 21} />
            {disturbanceMagnitude > 1 ? (
              <>
                <path className="elastic-tether" d={`M${ball.x} ${ball.y}L${draggedBall.x} ${draggedBall.y}`} />
                <path
                  className="velocity-vector"
                  markerEnd="url(#velocity-arrow)"
                  d={`M${draggedBall.x} ${draggedBall.y}L${draggedBall.x + 58 + disturbance.x * 0.2} ${draggedBall.y - 42 + disturbance.y * 0.15}`}
                />
              </>
            ) : null}
            <path className="drop-target" d={`M${dropPoint.x - 14} ${dropPoint.y - 14}h9M${dropPoint.x - 14} ${dropPoint.y - 14}v9M${dropPoint.x + 14} ${dropPoint.y - 14}h-9M${dropPoint.x + 14} ${dropPoint.y - 14}v9M${dropPoint.x - 14} ${dropPoint.y + 14}h9M${dropPoint.x - 14} ${dropPoint.y + 14}v-9M${dropPoint.x + 14} ${dropPoint.y + 14}h-9M${dropPoint.x + 14} ${dropPoint.y + 14}v-9`} />
            <path className="centre-cross" d="M364 300h32M380 284v32" />

            {cursor ? (
              <g className="cursor-crosshair">
                <path d={`M${cursor.x - 13} ${cursor.y}h26M${cursor.x} ${cursor.y - 13}v26`} />
                <circle cx={cursor.x} cy={cursor.y} r="3" />
              </g>
            ) : null}
          </svg>
        </div>

        <aside className="instrument-side" aria-label="Trajectory analysis panels">
          <TrackingPanel ball={ball} />
          <ConfidencePanel seconds={seconds} />
          <div className="trajectory-legend" aria-label="Trajectory legend">
            <p><i className="legend-observed" /> observed trajectory</p>
            <p><i className="legend-predicted" /> predicted trajectory</p>
            <p><i className="legend-uncertainty" /> uncertainty (95%)</p>
            <p><i className="legend-centroid" /> detected centroid</p>
          </div>
        </aside>
      </div>

      <p className="drag-instruction">Drag the ball. Disturb the forecast.</p>
      <div className="instrument-controls">
        <div className="play-control">
          <output htmlFor="observation-window"><span>{seconds.toFixed(1)}s</span> observed</output>
          <button
            type="button"
            onClick={() => setPlaying((current) => !current)}
            aria-label={playing ? "Pause trajectory playback" : "Play trajectory playback"}
            aria-pressed={playing}
          >
            <PlayPauseIcon playing={playing} />
          </button>
        </div>

        <div className="slider-wrap">
          <input
            id="observation-window"
            type="range"
            min={MIN_SECONDS}
            max={MAX_SECONDS}
            step="0.1"
            value={seconds}
            style={{ "--range-progress": `${((seconds - MIN_SECONDS) / (MAX_SECONDS - MIN_SECONDS)) * 100}%` } as React.CSSProperties}
            onChange={(event) => {
              setPlaying(false);
              setSeconds(Number(event.target.value));
            }}
            aria-label="Observed motion in seconds"
          />
          <div className="slider-ticks" aria-hidden="true">
            {[2, 4, 6, 8, 10].map((value) => <span key={value}>{value}s</span>)}
          </div>
        </div>

        <p className="control-help">Drag to change how much motion the model can see.</p>
      </div>
    </div>
  );
}
