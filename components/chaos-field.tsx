"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

type ChaosFieldProps = {
  start: Point;
  end: Point;
  disturbance: Point;
  cursor: Point | null;
  releaseId: number;
  releaseOrigin: Point;
  reducedMotion: boolean;
};

type Particle = {
  offset: number;
  phase: number;
  progress: number;
  speed: number;
  width: number;
};

function pointOnCurve(start: Point, controlA: Point, controlB: Point, end: Point, progress: number) {
  const inverse = 1 - progress;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * progress * controlA.x +
      3 * inverse * progress ** 2 * controlB.x +
      progress ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * progress * controlA.y +
      3 * inverse * progress ** 2 * controlB.y +
      progress ** 3 * end.y,
  };
}

function tangentOnCurve(start: Point, controlA: Point, controlB: Point, end: Point, progress: number) {
  const inverse = 1 - progress;
  return {
    x:
      3 * inverse ** 2 * (controlA.x - start.x) +
      6 * inverse * progress * (controlB.x - controlA.x) +
      3 * progress ** 2 * (end.x - controlB.x),
    y:
      3 * inverse ** 2 * (controlA.y - start.y) +
      6 * inverse * progress * (controlB.y - controlA.y) +
      3 * progress ** 2 * (end.y - controlB.y),
  };
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = (index * 0.61803398875) % 1;
    const signed = ((index * 37) % count) / Math.max(1, count - 1) - 0.5;
    return {
      offset: signed * 2,
      phase: sequence * Math.PI * 2,
      progress: (index * 0.173) % 1,
      speed: 0.000014 + (index % 11) * 0.0000012,
      width: 0.45 + (index % 5) * 0.18,
    };
  });
}

export function ChaosField({
  start,
  end,
  disturbance,
  cursor,
  releaseId,
  releaseOrigin,
  reducedMotion,
}: ChaosFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const valuesRef = useRef({ start, end, disturbance, cursor, releaseId, releaseOrigin, reducedMotion });
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    valuesRef.current = { start, end, disturbance, cursor, releaseId, releaseOrigin, reducedMotion };
    redrawRef.current?.();
  }, [cursor, disturbance, end, reducedMotion, releaseId, releaseOrigin, start]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let frame = 0;
    let visible = false;
    let pageVisible = document.visibilityState === "visible";
    let shockStartedAt = 0;
    let lastReleaseId = valuesRef.current.releaseId;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      particles = createParticles(width < 520 ? 80 : 220);
      draw(performance.now());
    };

    const draw = (time: number) => {
      const values = valuesRef.current;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const scaleX = width / 760;
      const scaleY = height / 620;
      context.save();
      context.scale(scaleX, scaleY);
      context.globalCompositeOperation = "screen";

      const startPoint = values.start;
      const endPoint = values.end;
      const magnitude = Math.hypot(values.disturbance.x, values.disturbance.y);
      const controlA = {
        x: startPoint.x + 82 + values.disturbance.x * 0.72,
        y: startPoint.y - 72 + values.disturbance.y * 0.55,
      };
      const controlB = {
        x: endPoint.x - 86 + values.disturbance.x * 0.22,
        y: endPoint.y - 48 + values.disturbance.y * 0.18,
      };

      for (let contourIndex = 0; contourIndex < 7; contourIndex += 1) {
        context.beginPath();
        for (let step = 0; step <= 34; step += 1) {
          const progress = step / 34;
          const point = pointOnCurve(startPoint, controlA, controlB, endPoint, progress);
          const tangent = tangentOnCurve(startPoint, controlA, controlB, endPoint, progress);
          const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
          const spread = (contourIndex - 3) * (2 + progress ** 1.75 * (12 + magnitude * 0.08));
          const x = point.x + (-tangent.y / length) * spread;
          const y = point.y + (tangent.x / length) * spread;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(169, 191, 255, ${0.055 + contourIndex * 0.007})`;
        context.lineWidth = 0.6;
        context.stroke();
      }

      for (const particle of particles) {
        const progress = values.reducedMotion
          ? particle.progress
          : (particle.progress + time * particle.speed) % 1;
        const previousProgress = Math.max(0, progress - 0.022);
        const point = pointOnCurve(startPoint, controlA, controlB, endPoint, progress);
        const previous = pointOnCurve(startPoint, controlA, controlB, endPoint, previousProgress);
        const tangent = tangentOnCurve(startPoint, controlA, controlB, endPoint, progress);
        const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
        const normal = { x: -tangent.y / length, y: tangent.x / length };
        const spread = (4 + progress ** 1.8 * (82 + magnitude * 0.55)) * particle.offset;
        const pulse = Math.sin(particle.phase + time * 0.0014) * progress * 8;
        const chaos = progress ** 2;
        const outwardBreak = chaos * (20 + Math.abs(particle.offset) * 38 + magnitude * 0.16);
        const verticalBreak = Math.sin(particle.phase * 1.7 + time * 0.0011) * chaos * 18;
        let x = point.x + normal.x * (spread + pulse) + outwardBreak;
        let y = point.y + normal.y * (spread + pulse) + verticalBreak;
        let previousX = previous.x + normal.x * (spread * 0.92 + pulse) + outwardBreak * 0.9;
        let previousY = previous.y + normal.y * (spread * 0.92 + pulse) + verticalBreak * 0.9;

        if (values.cursor) {
          const deltaX = values.cursor.x - x;
          const deltaY = values.cursor.y - y;
          const distance = Math.max(24, Math.hypot(deltaX, deltaY));
          const gravity = Math.min(0.16, 310 / (distance * distance));
          x += deltaX * gravity;
          y += deltaY * gravity;
          previousX += deltaX * gravity * 0.82;
          previousY += deltaY * gravity * 0.82;
        }

        const alpha = 0.15 + progress * 0.7;
        context.beginPath();
        context.moveTo(previousX, previousY);
        context.lineTo(x, y);
        context.strokeStyle = particle.phase < 0.34
          ? `rgba(216, 255, 69, ${alpha * 0.7})`
          : `rgba(169, 191, 255, ${alpha})`;
        context.lineWidth = particle.width;
        context.stroke();

        if (particle.width > 0.95) {
          context.fillStyle = `rgba(202, 215, 255, ${Math.min(0.9, alpha + 0.12)})`;
          context.fillRect(x - 0.7, y - 0.7, 1.4, 1.4);
        }
      }

      if (values.releaseId !== lastReleaseId) {
        lastReleaseId = values.releaseId;
        shockStartedAt = time;
      }

      if (shockStartedAt > 0) {
        const progress = Math.min(1, (time - shockStartedAt) / 1050);
        const eased = 1 - (1 - progress) ** 3;

        for (let ray = 0; ray < 32; ray += 1) {
          const angle = ray * 2.399963 + progress * 0.42;
          const variance = 0.72 + ((ray * 29) % 17) / 28;
          const innerRadius = 14 + eased * (34 + (ray % 5) * 7);
          const outerRadius = innerRadius + (1 - progress) * (28 + (ray % 7) * 5) * variance;
          context.beginPath();
          context.moveTo(
            values.releaseOrigin.x + Math.cos(angle) * innerRadius,
            values.releaseOrigin.y + Math.sin(angle) * innerRadius,
          );
          context.lineTo(
            values.releaseOrigin.x + Math.cos(angle) * outerRadius,
            values.releaseOrigin.y + Math.sin(angle) * outerRadius,
          );
          context.strokeStyle = ray % 4 === 0
            ? `rgba(216, 255, 69, ${(1 - progress) * 0.72})`
            : `rgba(169, 191, 255, ${(1 - progress) * 0.56})`;
          context.lineWidth = ray % 6 === 0 ? 1.4 : 0.7;
          context.stroke();
        }

        for (let ring = 0; ring < 3; ring += 1) {
          const ringProgress = Math.max(0, Math.min(1, progress * 1.28 - ring * 0.12));
          context.beginPath();
          context.arc(values.releaseOrigin.x, values.releaseOrigin.y, 12 + ringProgress * (112 + ring * 28), 0, Math.PI * 2);
          context.setLineDash(ring === 1 ? [3, 5] : []);
          context.strokeStyle = ring === 2
            ? `rgba(169, 191, 255, ${(1 - ringProgress) * 0.32})`
            : `rgba(216, 255, 69, ${(1 - ringProgress) * (0.54 - ring * 0.1)})`;
          context.lineWidth = ring === 0 ? 1.4 : 0.7;
          context.stroke();
        }
        context.setLineDash([]);
        if (progress === 1) shockStartedAt = 0;
      }

      context.restore();
    };

    const tick = (time: number) => {
      draw(time);
      frame = visible && pageVisible && !valuesRef.current.reducedMotion
        ? window.requestAnimationFrame(tick)
        : 0;
    };

    const startLoop = () => {
      if (frame || !visible || !pageVisible || valuesRef.current.reducedMotion) {
        draw(performance.now());
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
    };

    redrawRef.current = () => {
      if (valuesRef.current.reducedMotion) draw(performance.now());
      else startLoop();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    }, { rootMargin: "120px" });
    intersectionObserver.observe(canvas);

    const handleVisibility = () => {
      pageVisible = document.visibilityState === "visible";
      if (pageVisible) startLoop();
      else stopLoop();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    resize();

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      redrawRef.current = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="chaos-field" aria-hidden="true" />;
}
