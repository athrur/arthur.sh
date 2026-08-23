"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import {
  COMPARISON_RESULTS,
  CONDITION_RESULTS,
  HORIZON_RESULTS,
  HORIZONS,
  type Comparison,
  type Horizon,
  type InputCondition,
} from "@/content/roulette-data";

type Point = { x: number; y: number };

const START_ANGLE = -152;
const DROP_ANGLE = 58;

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
  return `M${start.x} ${start.y}A${radius} ${radius} 0 ${endAngle - startAngle <= 180 ? 0 : 1} 0 ${end.x} ${end.y}`;
}

function predictionCurve(start: Point, end: Point, spread: number, index: number, comparison: Comparison) {
  if (comparison === "last-angle") {
    const jitter = (index - 12) * 0.55;
    return `M${start.x} ${start.y}C${start.x + 2} ${start.y + jitter} ${start.x + 5} ${start.y + jitter} ${start.x + 8} ${start.y + jitter}`;
  }
  if (comparison === "random") {
    const angle = ((index * 137.5) % 360) - 180;
    const randomEnd = polarPoint(360, 268, 184 + ((index % 5) - 2) * 8, angle);
    return `M${start.x} ${start.y}C${start.x + 70} ${start.y - 70 + index * 3} ${randomEnd.x - 55} ${randomEnd.y + 30} ${randomEnd.x} ${randomEnd.y}`;
  }

  const signed = (index - 12) / 12;
  const bend = signed * spread;
  return `M${start.x} ${start.y}C${start.x + 88 + bend * 0.18} ${start.y - 86 + bend * 0.52} ${end.x - 92 + bend * 0.42} ${end.y - 52 + bend * 0.8} ${end.x + bend * 0.25} ${end.y + bend * 0.45}`;
}

function FeatureFlow() {
  return (
    <div className="feature-flow" aria-label="Sequence-to-sequence model architecture">
      <div className="feature-vector">
        <span>INPUT x<sub>t</sub></span>
        <code>sin θ<sub>t</sub><br />cos θ<sub>t</sub><br />r<sub>t</sub><br />θ̇<sub>t</sub>, ṙ<sub>t</sub></code>
      </div>
      <i aria-hidden="true" />
      <div className="model-node accent-node"><span>LSTM ENCODER</span><small>128 units</small></div>
      <i aria-hidden="true" />
      <div className="hidden-node">h<sub>T</sub></div>
      <i aria-hidden="true" />
      <div className="model-node prediction-node"><span>LSTM DECODER</span><small>128 units</small></div>
      <i aria-hidden="true" />
      <div className="feature-vector output-vector">
        <span>PREDICTED</span>
        <code>sin θ̂<sub>t+1</sub><br />cos θ̂<sub>t+1</sub><br />θ̂<sub>t+1</sub></code>
      </div>
    </div>
  );
}

function ForecastWheel({ horizon, ballMae, comparison, runId }: { horizon: Horizon; ballMae: number; comparison: Comparison; runId: number }) {
  const seconds = HORIZON_RESULTS[horizon].seconds;
  const observedEnd = START_ANGLE + 82 + ((horizon - 100) / 400) * 46;
  const observedStart = polarPoint(360, 268, 184, observedEnd);
  const dropPoint = polarPoint(360, 268, 184, DROP_ANGLE);
  const spread = 20 + Math.min(170, ballMae * 108);
  const observedPoints = Array.from({ length: 13 }, (_, index) => polarPoint(360, 268, 184, START_ANGLE + ((observedEnd - START_ANGLE) * index) / 12));
  const meanPath = predictionCurve(observedStart, dropPoint, 0, 12, comparison);

  return (
    <svg className="lab-wheel" viewBox="0 0 720 540" role="img" aria-label={`${seconds} seconds observed. ${comparison} forecast with ${ballMae.toFixed(3)} radians mean angular error.`}>
      <g className="lab-rings">
        <circle cx="360" cy="268" r="230" />
        <circle cx="360" cy="268" r="208" />
        <circle cx="360" cy="268" r="184" />
        <circle cx="360" cy="268" r="132" />
        <circle cx="360" cy="268" r="76" className="dashed" />
        <circle cx="360" cy="268" r="28" />
        {Array.from({ length: 37 }, (_, index) => {
          const angle = (index / 37) * Math.PI * 2;
          const inner = {
            x: Number((360 + Math.cos(angle) * 208).toFixed(3)),
            y: Number((268 + Math.sin(angle) * 208).toFixed(3)),
          };
          const outer = {
            x: Number((360 + Math.cos(angle) * 230).toFixed(3)),
            y: Number((268 + Math.sin(angle) * 230).toFixed(3)),
          };
          return <path key={index} d={`M${inner.x} ${inner.y}L${outer.x} ${outer.y}`} />;
        })}
      </g>

      <path className="lab-observed-path" d={arcPath(360, 268, 184, START_ANGLE, observedEnd)} />
      {observedPoints.map((point, index) => (
        <g className="lab-observed-point" key={index}>
          <rect x={point.x - 7} y={point.y - 7} width="14" height="14" />
          <circle cx={point.x} cy={point.y} r={index === observedPoints.length - 1 ? 5 : 3} />
        </g>
      ))}

      <g className="forecast-fan" key={`${horizon}-${comparison}-${ballMae}-${runId}`}>
        {Array.from({ length: 25 }, (_, index) => (
          <path key={index} d={predictionCurve(observedStart, dropPoint, spread, index, comparison)} />
        ))}
        <path className="forecast-mean" d={meanPath} />
      </g>

      <g className="drop-boundary">
        <path d={`M${dropPoint.x - 17} ${dropPoint.y - 17}h11M${dropPoint.x - 17} ${dropPoint.y - 17}v11M${dropPoint.x + 17} ${dropPoint.y + 17}h-11M${dropPoint.x + 17} ${dropPoint.y + 17}v-11`} />
        <text x={dropPoint.x + 16} y={dropPoint.y - 18}>t*</text>
      </g>

      <path className="lab-centre-cross" d="M342 268h36M360 250v36" />
      <g className="lab-time-axis">
        <path d="M94 518H626" />
        {[0, 2, 4, 6, 8, 10].map((tick) => {
          const x = 94 + (tick / 10) * 532;
          return <g key={tick}><path d={`M${x} 512v12`} /><text x={x - 8} y="538">{tick}s</text></g>;
        })}
        <path className="time-observed" d={`M94 518H${94 + (seconds / 10) * 532}`} />
        <rect className="time-marker" x={88 + (seconds / 10) * 532} y="512" width="12" height="12" />
      </g>
    </svg>
  );
}

function SignalCharts({ horizon, error, comparison }: { horizon: Horizon; error: number; comparison: Comparison }) {
  const seconds = HORIZON_RESULTS[horizon].seconds;
  const boundaryX = 28 + (seconds / 10) * 654;
  const fan = Math.min(48, 5 + error * 28);
  const observedEndY = 58 - Math.sin(seconds * 0.8) * 13;
  const predictedEndY = comparison === "last-angle" ? observedEndY : comparison === "random" ? 82 : 54 + error * 8;
  const upper = `M${boundaryX} ${observedEndY}C${boundaryX + 90} ${observedEndY - 8 - fan * 0.2} 590 ${predictedEndY - fan} 682 ${predictedEndY - fan * 0.65}L682 ${predictedEndY + fan * 0.65}C590 ${predictedEndY + fan} ${boundaryX + 90} ${observedEndY + 8 + fan * 0.2} ${boundaryX} ${observedEndY}Z`;

  return (
    <svg className="lab-signals" viewBox="0 0 710 190" role="img" aria-label="Observed and predicted unwrapped angle and radius signals">
      <path className="signal-grid" d="M28 14H682M28 84H682M28 106H682M28 174H682M28 48H682M28 140H682" />
      <text x="28" y="10">UNWRAPPED ANGLE θ (rad)</text>
      <text x="28" y="102">RADIUS r (unit)</text>
      <path className="signal-observed" d={`M28 68C105 62 148 38 215 55S335 75 ${boundaryX} ${observedEndY}`} />
      <path className="signal-uncertainty" d={upper} />
      <path className="signal-predicted" d={`M${boundaryX} ${observedEndY}C${boundaryX + 90} ${observedEndY - 4} 590 ${predictedEndY - 7} 682 ${predictedEndY}`} />
      <path className="signal-radius-observed" d={`M28 132C140 127 238 136 ${boundaryX} 130`} />
      <path className="signal-radius-predicted" d={`M${boundaryX} 130C${boundaryX + 90} 131 590 135 682 ${132 + Math.min(24, error * 12)}`} />
      <path className="signal-boundary" d={`M${boundaryX} 14V174`} />
      <text x={Math.min(660, boundaryX + 7)} y="25">T={horizon}</text>
      <text x="28" y="188">0s</text><text x="348" y="188">5s</text><text x="664" y="188">10s</text>
    </svg>
  );
}

export function ModelLab() {
  const reduceMotion = useReducedMotion();
  const [horizon, setHorizon] = useState<Horizon>(300);
  const [condition, setCondition] = useState<InputCondition>("full");
  const [comparison, setComparison] = useState<Comparison>("lstm");
  const [runId, setRunId] = useState(0);

  const selectHorizon = (next: Horizon) => {
    setCondition("full");
    setComparison("lstm");
    setHorizon(next);
    setRunId((current) => current + 1);
  };

  const selectCondition = (next: InputCondition) => {
    setCondition(next);
    setComparison("lstm");
    if (next !== "full") setHorizon(300);
    setRunId((current) => current + 1);
  };

  const selectComparison = (next: Comparison) => {
    setComparison(next);
    setCondition("full");
    if (next !== "lstm") setHorizon(300);
    setRunId((current) => current + 1);
  };

  const result = useMemo(() => {
    if (comparison !== "lstm") return COMPARISON_RESULTS[comparison];
    if (condition !== "full") return CONDITION_RESULTS[condition];
    return HORIZON_RESULTS[horizon];
  }, [comparison, condition, horizon]);

  const reportedAtT300 = comparison !== "lstm" || condition !== "full";
  const timingMae = HORIZON_RESULTS[horizon].timingMae;
  const improvement = COMPARISON_RESULTS["last-angle"].ballMae / result.ballMae;

  return (
    <motion.section
      id="model-lab"
      className="model-lab page-gutter"
      aria-labelledby="lab-title"
      initial={reduceMotion ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className="lab-heading">
        <h2 id="lab-title">Reported<br />results.</h2>
        <p>Use the controls to view the recorded evaluation conditions.</p>
      </header>

      <div className="lab-layout">
        <aside className="lab-controls" aria-label="Experiment controls">
          <fieldset>
            <legend>OBSERVATION HORIZON</legend>
            <div className="horizon-options">
              {HORIZONS.map((value) => (
                <button type="button" key={value} onClick={() => selectHorizon(value)} aria-pressed={horizon === value && condition === "full" && comparison === "lstm"} disabled={reportedAtT300 && value !== 300}>
                  T={value}
                </button>
              ))}
            </div>
            <small>T is the number of observed frames at 50 FPS.</small>
          </fieldset>

          <fieldset>
            <legend>INPUT CONDITION</legend>
            <div className="radio-options">
              {([
                ["full", "FULL INPUT"],
                ["noise", "GAUSSIAN NOISE  σ=0.05"],
                ["no-angular", "NO DERIVED ANGULAR FEATURES"],
              ] as const).map(([value, label]) => (
                <button type="button" key={value} onClick={() => selectCondition(value)} aria-pressed={condition === value && comparison === "lstm"}>
                  <i aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <small>These tests were measured at T=300.</small>
          </fieldset>

          <fieldset>
            <legend>COMPARE AGAINST</legend>
            <div className="radio-options">
              {([
                ["lstm", "LSTM"],
                ["last-angle", "LAST-ANGLE"],
                ["random", "RANDOM"],
              ] as const).map(([value, label]) => (
                <button type="button" key={value} onClick={() => selectComparison(value)} aria-pressed={comparison === value}>
                  <i aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <small>Baselines were reported at T=300.</small>
          </fieldset>

          <button className="replay-forecast" type="button" onClick={() => setRunId((current) => current + 1)}>
            <span aria-hidden="true">▶</span> REPLAY VIEW
          </button>

          <p className="surrogate-note"><i /> <span>RESULTS VIEWER</span>These controls show the reported conditions; they do not run the trained network.</p>
        </aside>

        <div className="lab-canvas">
          <FeatureFlow />
          <div className="lab-legend" aria-hidden="true"><span>observed (input)</span><span>predicted (forecast)</span><span>uncertainty (95%)</span></div>
          <ForecastWheel horizon={horizon} ballMae={result.ballMae} comparison={comparison} runId={runId} />
          <SignalCharts horizon={horizon} error={result.ballMae} comparison={comparison} />
        </div>

        <aside className="lab-readouts" aria-label="Reported experiment result">
          <p className="current-setting">CURRENT SETTING <span>T = {horizon} <small>({HORIZON_RESULTS[horizon].seconds.toFixed(1)}s)</small></span></p>
          <dl>
            <div><dt>BALL PATH ERROR</dt><dd>{result.ballMae.toFixed(3)} <small>rad</small></dd><p>mean angular error</p></div>
            <div><dt>DROP-OFF ERROR</dt><dd>{result.ballDropError.toFixed(3)} <small>rad</small></dd><p>| θ(t*) − θ̂(t*) |</p></div>
            <div><dt>DROP-OFF TIME ERROR</dt><dd>{timingMae.toFixed(2)} <small>frames</small></dd><p>{(timingMae / 50).toFixed(2)} seconds</p></div>
            <div className="comparison-readout"><dt>VS. LAST-ANGLE</dt><dd>{improvement.toFixed(1)}× <small>{improvement >= 1 ? "lower" : "higher"}</small></dd><p>path error ratio at T=300</p></div>
          </dl>
          <pre aria-label="Serialized experiment condition">{`{
  "horizon_T": ${horizon},
  "condition": "${condition}",
  "forecaster": "${comparison}"
}`}</pre>
        </aside>
      </div>
    </motion.section>
  );
}
