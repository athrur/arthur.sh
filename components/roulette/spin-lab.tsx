"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };
type SpinPhase = "ready" | "dragging" | "running" | "coasting" | "complete";
type Sample = Point & { missing: boolean; index: number };
type Impact = Point & { id: number; kind: "wall" | "centre" | "deflector" | "nudge" };
type PocketColor = "red" | "black" | "green";
type SpinOutcome = { index: number; number: number; color: PocketColor };

const CENTRE = { x: 360, y: 286 };
const RIM_RADIUS = 204;
const TRACK_RADIUS = 234;
const START_ANGLE = 2.82;
const OUTER_WALL = 244;
const CENTRE_BOSS = 58;
const SLOPE_ACCELERATION = 100;
const INNER_WHEEL_RADIUS = 174;
const MAX_RUN_TIME = 12;
const TAP_SPEED = 260;
const POCKET_RADIUS = 153;
const SPIN_VIEWBOX = { x: 110, y: 60, width: 500, height: 450 } as const;
const WHEEL_SECTOR = (Math.PI * 2) / 37;
const EUROPEAN_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26] as const;
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function pointAt(angle: number, radius = RIM_RADIUS): Point {
  return {
    x: Number((CENTRE.x + Math.cos(angle) * radius).toFixed(3)),
    y: Number((CENTRE.y + Math.sin(angle) * radius).toFixed(3)),
  };
}

function clampVector(vector: Point, max = 138): Point {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude <= max) return vector;
  return { x: vector.x * max / magnitude, y: vector.y * max / magnitude };
}

function magnitude(vector: Point) {
  return Math.hypot(vector.x, vector.y);
}

function unitVector(vector: Point, fallback: Point = { x: 1, y: 0 }): Point {
  const length = magnitude(vector);
  return length < 0.001 ? fallback : { x: vector.x / length, y: vector.y / length };
}

function normalizedAngle(angle: number) {
  return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

function shortestAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function pocketColor(number: number): PocketColor {
  return number === 0 ? "green" : RED_NUMBERS.has(number) ? "red" : "black";
}

function ringSegmentPath(index: number, innerRadius: number, outerRadius: number) {
  const centreAngle = index * WHEEL_SECTOR;
  const startAngle = centreAngle - WHEEL_SECTOR / 2;
  const endAngle = centreAngle + WHEEL_SECTOR / 2;
  const outerStart = pointAt(startAngle, outerRadius);
  const outerEnd = pointAt(endAngle, outerRadius);
  const innerEnd = pointAt(endAngle, innerRadius);
  const innerStart = pointAt(startAngle, innerRadius);
  return `M${outerStart.x} ${outerStart.y}A${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}L${innerEnd.x} ${innerEnd.y}A${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}Z`;
}

function isOccluded(angle: number) {
  const normalized = normalizedAngle(angle);
  return normalized > 0.72 && normalized < 1.38;
}

const wheelTicks = Array.from({ length: 37 }, (_, index) => {
  const angle = (index / 37) * Math.PI * 2;
  const inner = pointAt(angle, 224);
  const outer = pointAt(angle, 250);
  return `M${inner.x} ${inner.y}L${outer.x} ${outer.y}`;
});

const deflectors = Array.from({ length: 8 }, (_, index) => pointAt((index / 8) * Math.PI * 2 + 0.18, 196));

export function SpinLab() {
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const ballHitRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const rotorRef = useRef<SVGGElement>(null);
  const start = useMemo(() => pointAt(START_ANGLE, TRACK_RADIUS), []);
  const physicsRef = useRef({
    x: start.x,
    y: start.y,
    vx: 0,
    vy: 0,
    angle: START_ANGLE,
    radius: TRACK_RADIUS,
    omega: 0,
    elapsed: 0,
    dropAt: 5.2,
    endAt: MAX_RUN_TIME,
    radialSlope: 0,
    sampleIndex: 0,
    lastSampleAt: 0,
    impacts: 0,
    lastImpactAt: -1,
    wheelAngle: 0,
    wheelOmega: -1.55,
    capturedPocket: -1,
    captureAt: -1,
    settledAt: -1,
  });
  const lastLaunchRef = useRef({ vx: 164, vy: -164, dropAt: 4.8 });
  const missingCountRef = useRef(0);
  const [phase, setPhase] = useState<SpinPhase>("ready");
  const [pull, setPull] = useState<Point>({ x: 0, y: 0 });
  const [horizon, setHorizon] = useState(6);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [dropDetected, setDropDetected] = useState(false);
  const [launchSpeed, setLaunchSpeed] = useState(TAP_SPEED);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [outcome, setOutcome] = useState<SpinOutcome | null>(null);
  const [lastAction, setLastAction] = useState("READY");
  const [telemetry, setTelemetry] = useState({ angle: START_ANGLE, radius: TRACK_RADIUS, omega: 0, speed: 0, elapsed: 0, confidence: 1, missing: 0, slope: 0, impacts: 0, trackState: "OUTER TRACK", wheelAngle: 0, wheelOmega: -1.55 });

  const pulledBall = { x: start.x + pull.x, y: start.y + pull.y };
  const pullMagnitude = Math.hypot(pull.x, pull.y);
  const predictedSpeed = TAP_SPEED + pullMagnitude * 6.1;

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const resetSpin = () => {
    const point = pointAt(START_ANGLE, TRACK_RADIUS);
    physicsRef.current = { x: point.x, y: point.y, vx: 0, vy: 0, angle: START_ANGLE, radius: TRACK_RADIUS, omega: 0, elapsed: 0, dropAt: 5.2, endAt: MAX_RUN_TIME, radialSlope: 0, sampleIndex: 0, lastSampleAt: 0, impacts: 0, lastImpactAt: -1, wheelAngle: 0, wheelOmega: -1.55, capturedPocket: -1, captureAt: -1, settledAt: -1 };
    ballRef.current?.setAttribute("cx", String(point.x));
    ballRef.current?.setAttribute("cy", String(point.y));
    ballHitRef.current?.setAttribute("cx", String(point.x));
    ballHitRef.current?.setAttribute("cy", String(point.y));
    trailRef.current?.setAttribute("d", `M${point.x} ${point.y}`);
    rotorRef.current?.setAttribute("transform", `rotate(0 ${CENTRE.x} ${CENTRE.y})`);
    setPull({ x: 0, y: 0 });
    setSamples([]);
    missingCountRef.current = 0;
    setDropDetected(false);
    setImpact(null);
    setOutcome(null);
    setLastAction("READY");
    setLaunchSpeed(TAP_SPEED);
    setTelemetry({ angle: START_ANGLE, radius: TRACK_RADIUS, omega: 0, speed: 0, elapsed: 0, confidence: 1, missing: 0, slope: 0, impacts: 0, trackState: "OUTER TRACK", wheelAngle: 0, wheelOmega: -1.55 });
    setPhase("ready");
  };

  const launch = (vx: number, vy: number, dropAt: number, action = "FLING") => {
    const initial = pointAt(START_ANGLE, TRACK_RADIUS);
    const motionScale = reduceMotion ? 0.45 : 1;
    const actualVx = vx * motionScale;
    const actualVy = vy * motionScale;
    const speed = Math.hypot(actualVx, actualVy);
    const omega = ((initial.x - CENTRE.x) * actualVy - (initial.y - CENTRE.y) * actualVx) / (TRACK_RADIUS * TRACK_RADIUS);
    physicsRef.current = { x: initial.x, y: initial.y, vx: actualVx, vy: actualVy, angle: START_ANGLE, radius: TRACK_RADIUS, omega, elapsed: 0, dropAt, endAt: reduceMotion ? 4 : MAX_RUN_TIME, radialSlope: 0, sampleIndex: 0, lastSampleAt: 0, impacts: 0, lastImpactAt: -1, wheelAngle: 0, wheelOmega: reduceMotion ? -0.75 : -1.55, capturedPocket: -1, captureAt: -1, settledAt: -1 };
    lastLaunchRef.current = { vx, vy, dropAt };
    setLaunchSpeed(speed);
    ballRef.current?.setAttribute("cx", String(initial.x));
    ballRef.current?.setAttribute("cy", String(initial.y));
    ballHitRef.current?.setAttribute("cx", String(initial.x));
    ballHitRef.current?.setAttribute("cy", String(initial.y));
    trailRef.current?.setAttribute("d", `M${initial.x} ${initial.y}`);
    rotorRef.current?.setAttribute("transform", `rotate(0 ${CENTRE.x} ${CENTRE.y})`);
    setSamples([{ ...initial, missing: false, index: 0 }]);
    missingCountRef.current = 0;
    setDropDetected(false);
    setImpact(null);
    setOutcome(null);
    setLastAction(action);
    setPull({ x: 0, y: 0 });
    setPhase("running");
  };

  useEffect(() => {
    if ((phase !== "running" && phase !== "coasting") || !isVisible) return;
    let animationFrame = 0;
    let previous = performance.now();
    let renderCounter = 0;
    let path = trailRef.current?.getAttribute("d") ?? "";
    const radialHistory: number[] = [];

    const tick = (time: number) => {
      const delta = Math.min(0.034, Math.max(0.001, (time - previous) / 1000));
      previous = time;
      const physics = physicsRef.current;
      physics.elapsed += delta;
      physics.wheelAngle += physics.wheelOmega * delta;
      physics.wheelOmega *= Math.exp(-(physics.capturedPocket >= 0 ? 0.42 : 0.045) * delta);
      rotorRef.current?.setAttribute("transform", `rotate(${physics.wheelAngle * 180 / Math.PI} ${CENTRE.x} ${CENTRE.y})`);
      let relativeX = physics.x - CENTRE.x;
      let relativeY = physics.y - CENTRE.y;
      let radius = Math.max(0.001, Math.hypot(relativeX, relativeY));
      let collision: Impact["kind"] | null = null;

      if (physics.capturedPocket >= 0) {
        const targetAngle = physics.wheelAngle + physics.capturedPocket * WHEEL_SECTOR;
        const previousX = physics.x;
        const previousY = physics.y;
        physics.angle += shortestAngle(targetAngle - physics.angle) * Math.min(1, delta * 9);
        physics.radius += (POCKET_RADIUS - physics.radius) * Math.min(1, delta * 7);
        physics.x = CENTRE.x + Math.cos(physics.angle) * physics.radius;
        physics.y = CENTRE.y + Math.sin(physics.angle) * physics.radius;
        physics.vx = (physics.x - previousX) / delta;
        physics.vy = (physics.y - previousY) / delta;
        radius = physics.radius;
      } else {
        physics.vx -= (relativeX / radius) * SLOPE_ACCELERATION * delta;
        physics.vy -= (relativeY / radius) * SLOPE_ACCELERATION * delta;

        const damping = Math.exp(-0.22 * delta);
        physics.vx *= damping;
        physics.vy *= damping;
        physics.x += physics.vx * delta;
        physics.y += physics.vy * delta;

        relativeX = physics.x - CENTRE.x;
        relativeY = physics.y - CENTRE.y;
        radius = Math.max(0.001, Math.hypot(relativeX, relativeY));
        const normal = unitVector({ x: relativeX, y: relativeY }, { x: 1, y: 0 });

        if (radius > OUTER_WALL) {
          physics.x = CENTRE.x + normal.x * OUTER_WALL;
          physics.y = CENTRE.y + normal.y * OUTER_WALL;
          const outwardSpeed = physics.vx * normal.x + physics.vy * normal.y;
          if (outwardSpeed > 0) {
            const restitution = outwardSpeed > 170 ? 0.42 : 0.015;
            physics.vx -= (1 + restitution) * outwardSpeed * normal.x;
            physics.vy -= (1 + restitution) * outwardSpeed * normal.y;
            if (outwardSpeed > 90) collision = "wall";
          }
          radius = OUTER_WALL;
        } else if (radius < CENTRE_BOSS) {
          physics.x = CENTRE.x + normal.x * CENTRE_BOSS;
          physics.y = CENTRE.y + normal.y * CENTRE_BOSS;
          const inwardSpeed = physics.vx * normal.x + physics.vy * normal.y;
          if (inwardSpeed < 0) {
            physics.vx -= 1.72 * inwardSpeed * normal.x;
            physics.vy -= 1.72 * inwardSpeed * normal.y;
          }
          radius = CENTRE_BOSS;
          collision = "centre";
        }

        if (!collision && radius > 174 && radius < 220) {
          for (const deflector of deflectors) {
            const offset = { x: physics.x - deflector.x, y: physics.y - deflector.y };
            const distance = Math.hypot(offset.x, offset.y);
            if (distance >= 18) continue;
            const deflectorNormal = unitVector(offset, normal);
            const approachSpeed = physics.vx * deflectorNormal.x + physics.vy * deflectorNormal.y;
            physics.x = deflector.x + deflectorNormal.x * 18;
            physics.y = deflector.y + deflectorNormal.y * 18;
            if (approachSpeed < 0) {
              physics.vx -= 1.58 * approachSpeed * deflectorNormal.x;
              physics.vy -= 1.58 * approachSpeed * deflectorNormal.y;
            }
            radius = Math.hypot(physics.x - CENTRE.x, physics.y - CENTRE.y);
            collision = "deflector";
            break;
          }
        }
      }

      if (collision && physics.elapsed - physics.lastImpactAt > 0.11) {
        physics.lastImpactAt = physics.elapsed;
        physics.impacts += 1;
        setImpact({ x: physics.x, y: physics.y, kind: collision, id: performance.now() });
        setLastAction(collision === "wall" ? "RIM HIT" : collision === "deflector" ? "DEFLECTOR" : "CENTRE HIT");
      }

      relativeX = physics.x - CENTRE.x;
      relativeY = physics.y - CENTRE.y;
      physics.radius = radius;
      physics.angle = Math.atan2(relativeY, relativeX);
      physics.omega = (relativeX * physics.vy - relativeY * physics.vx) / Math.max(1, radius * radius);

      const position = { x: physics.x, y: physics.y };
      ballRef.current?.setAttribute("cx", String(position.x));
      ballRef.current?.setAttribute("cy", String(position.y));
      ballHitRef.current?.setAttribute("cx", String(position.x));
      ballHitRef.current?.setAttribute("cy", String(position.y));
      if (physics.settledAt < 0) {
        path += ` L${position.x.toFixed(2)} ${position.y.toFixed(2)}`;
        trailRef.current?.setAttribute("d", path);
      }

      if (physics.settledAt < 0 && physics.elapsed - physics.lastSampleAt >= 0.08) {
        physics.lastSampleAt = physics.elapsed;
        physics.sampleIndex += 1;
        const missing = isOccluded(physics.angle);
        if (missing) missingCountRef.current += 1;
        radialHistory.push(physics.radius / TRACK_RADIUS);
        if (radialHistory.length > 20) radialHistory.shift();
        physics.radialSlope = radialHistory.length >= 8 ? (radialHistory.at(-1)! - radialHistory[0]) / radialHistory.length : 0;
        setSamples((current) => [...current.slice(-94), { ...position, missing, index: physics.sampleIndex }]);
        if (physics.radialSlope < -0.006) setDropDetected(true);
      }

      renderCounter += 1;
      if (renderCounter % 5 === 0) {
        const currentlyOccluded = isOccluded(physics.angle);
        const radialUnit = unitVector({ x: relativeX, y: relativeY });
        const tangentialSpeed = Math.abs(-radialUnit.y * physics.vx + radialUnit.x * physics.vy);
        const trackState = physics.settledAt >= 0 ? "BALL AT REST" : physics.capturedPocket >= 0 ? "POCKET LOCK" : physics.radius > 216 && tangentialSpeed > Math.sqrt(SLOPE_ACCELERATION * physics.radius) * 0.88
          ? "RIM CONTACT"
          : physics.radius > 205 ? "DROPPING INWARD" : physics.radius > INNER_WHEEL_RADIUS ? "DEFLECTOR FIELD" : "INNER WHEEL";
        setTelemetry({
          angle: normalizedAngle(physics.angle),
          radius: physics.radius,
          omega: physics.settledAt >= 0 ? 0 : physics.omega,
          speed: physics.settledAt >= 0 ? 0 : Math.hypot(physics.vx, physics.vy),
          elapsed: physics.elapsed,
          confidence: currentlyOccluded ? 0.38 : 0.94,
          missing: missingCountRef.current,
          slope: physics.radialSlope,
          impacts: physics.impacts,
          trackState,
          wheelAngle: normalizedAngle(physics.wheelAngle),
          wheelOmega: physics.wheelOmega,
        });
      }

      const currentSpeed = Math.hypot(physics.vx, physics.vy);
      const readyForPocket = physics.radius <= INNER_WHEEL_RADIUS && currentSpeed < 135 && physics.elapsed > 1.4;
      const completedDescent = physics.elapsed >= physics.endAt && physics.radius < 182;
      const hardStop = physics.elapsed >= 16;
      if (physics.capturedPocket < 0 && (readyForPocket || completedDescent || hardStop)) {
        const relativePocketAngle = normalizedAngle(physics.angle - physics.wheelAngle);
        const pocketIndex = Math.round(relativePocketAngle / WHEEL_SECTOR) % EUROPEAN_WHEEL.length;
        const number = EUROPEAN_WHEEL[pocketIndex];
        physics.capturedPocket = pocketIndex;
        physics.captureAt = physics.elapsed;
        setOutcome({ index: pocketIndex, number, color: pocketColor(number) });
        setLastAction("POCKET LOCK");
      }

      if (physics.capturedPocket >= 0 && physics.settledAt < 0 && physics.elapsed - physics.captureAt >= (reduceMotion ? 0.35 : 1.05)) {
        physics.settledAt = physics.elapsed;
        setTelemetry((current) => ({
          ...current,
          angle: normalizedAngle(physics.angle),
          radius: physics.radius,
          omega: physics.omega,
          speed: currentSpeed,
          elapsed: physics.elapsed,
          slope: physics.radialSlope,
          impacts: physics.impacts,
          trackState: "BALL AT REST",
          wheelAngle: normalizedAngle(physics.wheelAngle),
          wheelOmega: physics.wheelOmega,
        }));
        setLastAction("WHEEL COASTING");
        setPhase("coasting");
      }

      const coastDuration = physics.settledAt < 0 ? 0 : physics.elapsed - physics.settledAt;
      if (physics.settledAt >= 0 && (Math.abs(physics.wheelOmega) <= 0.08 || coastDuration >= (reduceMotion ? 1.2 : 7))) {
        setLastAction("WHEEL AT REST");
        setPhase("complete");
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isVisible, phase, reduceMotion]);

  const pointerPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width / SPIN_VIEWBOX.width, rect.height / SPIN_VIEWBOX.height);
    const offsetX = (rect.width - SPIN_VIEWBOX.width * scale) / 2;
    const offsetY = (rect.height - SPIN_VIEWBOX.height * scale) / 2;
    return {
      x: SPIN_VIEWBOX.x + (event.clientX - rect.left - offsetX) / scale,
      y: SPIN_VIEWBOX.y + (event.clientY - rect.top - offsetY) / scale,
    };
  };

  const nudgeToward = (point: Point) => {
    const physics = physicsRef.current;
    physics.capturedPocket = -1;
    physics.captureAt = -1;
    setOutcome(null);
    const fallback = { x: -Math.sin(physics.angle), y: Math.cos(physics.angle) };
    const direction = unitVector({ x: point.x - physics.x, y: point.y - physics.y }, fallback);
    physics.vx += direction.x * 310;
    physics.vy += direction.y * 310;
    const speed = Math.hypot(physics.vx, physics.vy);
    if (speed > 1280) {
      physics.vx *= 1280 / speed;
      physics.vy *= 1280 / speed;
    }
    physics.endAt = Math.min(16, Math.max(physics.endAt, physics.elapsed + 3));
    setImpact({ x: physics.x, y: physics.y, kind: "nudge", id: performance.now() });
    setLastAction("NUDGE");
    setPhase("running");
  };

  const completeDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "dragging") return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pullMagnitude < 12) {
      setPull({ x: 0, y: 0 });
      const tangent = { x: -Math.sin(START_ANGLE), y: Math.cos(START_ANGLE) };
      const inward = unitVector({ x: CENTRE.x - start.x, y: CENTRE.y - start.y });
      launch(tangent.x * TAP_SPEED + inward.x * 54, tangent.y * TAP_SPEED + inward.y * 54, 4.3, "TAP");
      return;
    }
    const launchVector = { x: -pull.x, y: -pull.y };
    const direction = unitVector(launchVector);
    const dropAt = reduceMotion ? 2.6 : Math.max(3.6, Math.min(6.8, 7.05 - pullMagnitude * 0.022));
    launch(direction.x * predictedSpeed, direction.y * predictedSpeed, dropAt);
  };

  const currentPipelineStep = phase === "ready" || phase === "dragging" ? -1 : dropDetected ? 4 : telemetry.elapsed > 1.5 ? 3 : telemetry.elapsed > 0.8 ? 2 : telemetry.elapsed > 0.3 ? 1 : 0;
  const pipelineLabels = ["DETECT", "NORMALISE", "SMOOTH", "FIND DROP-OFF"];

  return (
    <section className="spin-lab page-gutter case-snap-section" id="launch" aria-labelledby="spin-lab-title">
      <aside className="spin-instructions">
        <h2 id="spin-lab-title">Following<br />a spin.</h2>
        <p>Drag the ball to set it moving. The display follows the positions, missing frames, and radial change recorded by the pipeline.</p>
        <div className="spin-actions">
          <button type="button" onClick={resetSpin}>RESET <span aria-hidden="true">↺</span></button>
          <button type="button" onClick={() => launch(lastLaunchRef.current.vx, lastLaunchRef.current.vy, lastLaunchRef.current.dropAt, "REPLAY")}>REPLAY <span aria-hidden="true">▷</span></button>
        </div>
        <p className="simulation-note">A browser physics sketch, separate from the trained models.</p>
      </aside>

      <div className="spin-centre">
        <div className="spin-launch-readout" aria-live="polite">
          <div><span>PULL DISTANCE</span><b>{pullMagnitude.toFixed(1)}</b><small>px</small></div>
          <div><span>VECTOR SPEED</span><b>{phase === "ready" || phase === "dragging" ? predictedSpeed.toFixed(0) : launchSpeed.toFixed(0)}</b><small>px/s</small></div>
          <div><span>STATE</span><b>{phase.toUpperCase()} · {lastAction}</b></div>
        </div>
        <div
          className={`spin-stage is-${phase}`}
          ref={stageRef}
          role="application"
          tabIndex={0}
          aria-label="Free-vector roulette simulation. Drag the ball in any direction and release. Tap anywhere during motion to knock it toward that point. Press Space for a default tap."
          onPointerDown={(event) => {
            const point = pointerPosition(event);
            if (phase === "complete") {
              resetSpin();
              return;
            }
            if (phase === "running") {
              nudgeToward(point);
              return;
            }
            if (phase === "coasting") return;
            const target = phase === "dragging" ? pulledBall : start;
            if (Math.hypot(point.x - target.x, point.y - target.y) > 54) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            resetSpin();
            setPhase("dragging");
          }}
          onPointerMove={(event) => {
            if (phase !== "dragging") return;
            const point = pointerPosition(event);
            setPull(clampVector({ x: point.x - start.x, y: point.y - start.y }));
          }}
          onPointerUp={completeDrag}
          onPointerCancel={completeDrag}
          onKeyDown={(event) => {
            if ((event.key === " " || event.key === "Enter") && phase !== "coasting") {
              event.preventDefault();
              const tangent = { x: -Math.sin(START_ANGLE), y: Math.cos(START_ANGLE) };
              launch(tangent.x * TAP_SPEED, tangent.y * TAP_SPEED, 4.8, "KEY TAP");
            }
            if (event.key === "Escape") resetSpin();
          }}
        >
          <svg viewBox={`${SPIN_VIEWBOX.x} ${SPIN_VIEWBOX.y} ${SPIN_VIEWBOX.width} ${SPIN_VIEWBOX.height}`} role="img" aria-label={`${phase}. ${telemetry.trackState}. Ball angle ${telemetry.angle.toFixed(2)} radians, radius ${(telemetry.radius / TRACK_RADIUS).toFixed(3)} units.`}>
            <defs>
              <marker id="spin-vector-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 8 4 0 8Z" /></marker>
              <filter id="spin-ball-glow" x="-400%" y="-400%" width="800%" height="800%"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <radialGradient id="spin-rotor-metal"><stop offset="0" stopColor="#8a8e8b" /><stop offset="0.16" stopColor="#1c1f1d" /><stop offset="0.48" stopColor="#5b5f5c" /><stop offset="0.7" stopColor="#111311" /><stop offset="1" stopColor="#747875" /></radialGradient>
              <radialGradient id="spin-rotor-deck"><stop offset="0" stopColor="#242725" /><stop offset="0.7" stopColor="#101210" /><stop offset="1" stopColor="#292d2a" /></radialGradient>
            </defs>
            <g className="spin-wheel">
              <circle cx="360" cy="286" r="254" /><circle cx="360" cy="286" r="224" /><circle cx="360" cy="286" r="204" /><circle cx="360" cy="286" r="166" /><circle cx="360" cy="286" r="112" /><circle cx="360" cy="286" r="38" />
              {wheelTicks.map((path, index) => <path d={path} key={index} />)}
            </g>
            <g className="spin-rotor" ref={rotorRef} transform={`rotate(0 ${CENTRE.x} ${CENTRE.y})`}>
              <circle className="spin-rotor-bed" cx={CENTRE.x} cy={CENTRE.y} r="178" />
              <g className="spin-pockets">
                {EUROPEAN_WHEEL.map((number, index) => {
                  const labelPoint = pointAt(index * WHEEL_SECTOR, 155);
                  const winning = outcome?.index === index;
                  return <g className={`spin-pocket is-${pocketColor(number)}${winning ? " is-winning" : ""}`} key={number}>
                    <path d={ringSegmentPath(index, 132, 174)} />
                    <text x={labelPoint.x} y={labelPoint.y} transform={`rotate(${index * 360 / 37 + 90} ${labelPoint.x} ${labelPoint.y})`}>{number}</text>
                  </g>;
                })}
              </g>
              <circle className="spin-rotor-deck" cx={CENTRE.x} cy={CENTRE.y} r="130" />
              {Array.from({ length: 12 }, (_, index) => {
                const startPoint = pointAt(index * Math.PI / 6, 34);
                const endPoint = pointAt(index * Math.PI / 6, 128);
                return <path className="spin-rotor-spoke" key={index} d={`M${startPoint.x} ${startPoint.y}L${endPoint.x} ${endPoint.y}`} />;
              })}
              <circle className="spin-spindle-base" cx={CENTRE.x} cy={CENTRE.y} r="31" />
              <circle className="spin-spindle-ring" cx={CENTRE.x} cy={CENTRE.y} r="19" />
              <circle className="spin-spindle-cap" cx={CENTRE.x} cy={CENTRE.y} r="8" />
            </g>
            <g className="spin-deflectors" aria-hidden="true">
              {deflectors.map((point, index) => <rect key={index} x={point.x - 6} y={point.y - 6} width="12" height="12" transform={`rotate(45 ${point.x} ${point.y})`} />)}
            </g>
            <text className="spin-slope-label" x="386" y="72">SLOPED INWARD ↘</text>
            <path className="spin-cross" d="M342 286h36M360 268v36" />
            <path className="spin-orbit-preview" d="M166 350A204 204 0 1 1 168 354" />
            <path className="spin-trail" ref={trailRef} d={`M${start.x} ${start.y}`} />
            <path className="spin-interpolation" d={samples.filter((sample) => sample.missing).map((sample, index) => `${index === 0 ? "M" : "L"}${sample.x} ${sample.y}`).join(" ")} />
            <g className="spin-samples">
              {samples.map((sample) => sample.missing
                ? <circle className="is-missing" key={sample.index} cx={sample.x} cy={sample.y} r="4" />
                : <rect key={sample.index} x={sample.x - 4} y={sample.y - 4} width="8" height="8" />)}
            </g>
            <path className="spin-occlusion-zone" d="M492 118A204 204 0 0 1 562 251L522 258A164 164 0 0 0 466 151Z" />
            <text className="spin-occlusion-label" x="534" y="112">OCCLUSION ZONE</text>
            {impact ? <circle key={impact.id} className={`spin-impact-ring is-${impact.kind}`} cx={impact.x} cy={impact.y} r="12" /> : null}
            {phase === "dragging" ? <>
              <path className="spin-tether" d={`M${start.x} ${start.y}L${pulledBall.x} ${pulledBall.y}`} />
              <path className="spin-launch-vector" markerEnd="url(#spin-vector-arrow)" d={`M${pulledBall.x} ${pulledBall.y}L${pulledBall.x - pull.x * 0.75} ${pulledBall.y - pull.y * 0.75}`} />
            </> : null}
            <circle className="spin-ball" ref={ballRef} cx={pulledBall.x} cy={pulledBall.y} r="9" filter="url(#spin-ball-glow)" />
            <circle className="spin-ball-hit" ref={ballHitRef} cx={pulledBall.x} cy={pulledBall.y} r="28" />
            <text className="spin-grab-label" x={Math.max(22, pulledBall.x - 76)} y={pulledBall.y + 50}>{phase === "dragging" ? "RELEASE ANYWHERE" : phase === "ready" ? "GRAB · TAP · FLING" : ""}</text>
          </svg>
        </div>

        <div className="spin-slope">
          <header><span>RADIAL SLOPE (Δr / frame)</span><b className={dropDetected ? "is-detected" : ""}>{dropDetected ? "DROP-OFF DETECTED" : "MONITORING"}</b></header>
          <svg viewBox="0 0 760 116" role="img" aria-label={`Current radial slope ${telemetry.slope.toFixed(4)}, threshold negative 0.006`}>
            <path className="slope-grid" d="M28 18H740M28 50H740M28 82H740" />
            <path className="slope-threshold" d="M28 70H740" />
            <path className="slope-series" d={`M28 42C126 34 208 51 296 45S436 48 510 52 ${Math.min(740, 510 + telemetry.elapsed * 28)} ${50 + Math.max(0, -telemetry.slope * 3100)}`} />
            <text x="2" y="22">+.006</text><text x="11" y="54">0</text><text x="0" y="74">−.006</text><text x="28" y="106">0s</text><text x="374" y="106">5s</text><text x="714" y="106">10s</text>
          </svg>
        </div>

        <div className="spin-timeline">
          <button type="button" onClick={() => phase === "running" || phase === "coasting" ? resetSpin() : launch(lastLaunchRef.current.vx, lastLaunchRef.current.vy, lastLaunchRef.current.dropAt, "REPLAY")} aria-label={phase === "running" || phase === "coasting" ? "Stop simulation" : "Play simulation"}>{phase === "running" || phase === "coasting" ? "■" : "▷"}</button>
          <div><i style={{ width: `${Math.min(100, telemetry.elapsed * 10)}%` }} /><b style={{ left: `${Math.min(100, telemetry.elapsed * 10)}%` }} /></div>
          <fieldset><legend>OBSERVATION HORIZON</legend>{[2, 4, 6, 8, 10].map((value) => <button key={value} type="button" aria-pressed={horizon === value} onClick={() => setHorizon(value)}>{value}s</button>)}</fieldset>
        </div>
      </div>

      <aside className={`spin-telemetry${outcome ? " has-result" : ""}`}>
        <header>TELEMETRY (LIVE)</header>
        <dl>
          <div><dt>TRACK STATE</dt><dd>{telemetry.trackState}</dd></div>
          <div><dt>BALL θ</dt><dd>{(telemetry.angle * 180 / Math.PI).toFixed(2)}°</dd></div>
          <div><dt>ROTOR θ</dt><dd>{(telemetry.wheelAngle * 180 / Math.PI).toFixed(2)}°</dd></div>
          <div><dt>BALL ω</dt><dd>{telemetry.omega.toFixed(2)} rad/s</dd></div>
          <div><dt>ROTOR ω</dt><dd>{telemetry.wheelOmega.toFixed(2)} rad/s</dd></div>
          <div><dt>SPEED |v|</dt><dd>{telemetry.speed.toFixed(0)} px/s</dd></div>
          <div><dt>OBSERVED FRAMES</dt><dd>{samples.length - telemetry.missing}</dd></div>
          <div><dt>MISSING FRAMES</dt><dd>{telemetry.missing}</dd></div>
        </dl>
        <div className="spin-pipeline">
          <p>PIPELINE (LIVE)</p>
          {pipelineLabels.map((label, index) => <div className={index < currentPipelineStep ? "is-complete" : index === currentPipelineStep ? "is-active" : ""} key={label}><i /><span>{label}</span><small>{index < currentPipelineStep ? "complete" : index === currentPipelineStep ? "processing…" : "waiting"}</small><b>{index < currentPipelineStep ? "✓" : ""}</b></div>)}
        </div>
        {outcome ? <div className={`spin-result is-${outcome.color}`} aria-live="assertive">
          <span>RESULT</span>
          <strong>{outcome.number}</strong>
          <b>{outcome.color.toUpperCase()}</b>
          <p>RELATIVE PHASE LOCKED</p>
          <button type="button" onClick={resetSpin}><i aria-hidden="true">↻</i> SPIN AGAIN <span aria-hidden="true">→</span></button>
        </div> : null}
        <p className="spin-keyboard-help">Tap to nudge the ball. Space launches. Escape resets.</p>
      </aside>
    </section>
  );
}
