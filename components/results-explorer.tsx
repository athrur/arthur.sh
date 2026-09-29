"use client";

import { useState } from "react";
import { ArrowIcon } from "@/components/arrow-icon";
import { HORIZON_RESULTS, HORIZONS, type Horizon } from "@/content/roulette-data";
import { site } from "@/content/site";

type BaselineMetric = "trajectory" | "drop-off";

const BASELINES: Record<BaselineMetric, Array<{ label: string; value: number; kind: string }>> = {
  trajectory: [
    { label: "RANDOM", value: 1.572, kind: "baseline" },
    { label: "LAST-ANGLE", value: 1.565, kind: "baseline" },
    { label: "LSTM", value: 0.185, kind: "model" },
  ],
  "drop-off": [
    { label: "RANDOM", value: 1.663, kind: "baseline" },
    { label: "LAST-ANGLE", value: 1.54, kind: "baseline" },
    { label: "LSTM", value: 0.33, kind: "model" },
  ],
};

function chartPoint(index: number, value: number, max: number) {
  return {
    x: 74 + index * 190,
    y: Number((246 - (value / max) * 190).toFixed(2)),
  };
}

function linePath(values: number[], max: number) {
  return values.map((value, index) => {
    const point = chartPoint(index, value, max);
    return `${index === 0 ? "M" : "L"}${point.x} ${point.y}`;
  }).join(" ");
}

function HorizonChart({ selected, onSelect }: { selected: Horizon; onSelect: (value: Horizon) => void }) {
  const timing = HORIZONS.map((horizon) => HORIZON_RESULTS[horizon].timingMae / 50);
  const ball = HORIZONS.map((horizon) => HORIZON_RESULTS[horizon].ballMae);
  const wheel = HORIZONS.map((horizon) => HORIZON_RESULTS[horizon].wheelMae);
  const selectedIndex = HORIZONS.indexOf(selected);
  const crosshairX = chartPoint(selectedIndex, 0, 1).x;

  return (
    <div className="horizon-chart-wrap">
      <div className="horizon-mobile-table" aria-label="Prediction errors by observation length">
        <header><span>INPUT</span><span>TIME MAE</span><span>BALL rad</span><span>WHEEL rad</span></header>
        {HORIZONS.map((horizon) => {
          const result = HORIZON_RESULTS[horizon];
          return (
            <button type="button" key={horizon} onClick={() => onSelect(horizon)} aria-pressed={selected === horizon}>
              <span><b>{result.seconds.toFixed(0)}s</b><small>T={horizon}</small></span>
              <span>{(result.timingMae / 50).toFixed(2)}s</span>
              <span>{result.ballMae.toFixed(3)}</span>
              <span>{result.wheelMae.toFixed(3)}</span>
            </button>
          );
        })}
      </div>
      <svg
        className="horizon-chart"
        viewBox="0 0 1000 360"
        role="img"
        aria-label="Prediction errors fall as the input horizon grows from 100 to 500 frames"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const rect = event.currentTarget.getBoundingClientRect();
          const localX = ((event.clientX - rect.left) / rect.width) * 1000;
          const index = Math.max(0, Math.min(4, Math.round((localX - 74) / 190)));
          onSelect(HORIZONS[index]);
        }}
      >
        <g className="results-grid">
          <path d="M74 48V246H834" />
          {[0, 1, 2, 3, 4].map((index) => <path key={index} d={`M74 ${48 + index * 49.5}H834`} />)}
        </g>
        <text className="axis-label timing-axis" x="74" y="31">TIME ERROR (s)</text>
        <text className="axis-label rad-axis" x="730" y="31">ANGLE ERROR (rad)</text>

        <path className="result-line timing-line" d={linePath(timing, 1.4)} />
        <path className="result-line ball-line" d={linePath(ball, 0.9)} />
        <path className="result-line wheel-line" d={linePath(wheel, 0.9)} />

        {HORIZONS.map((horizon, index) => {
          const timingPoint = chartPoint(index, timing[index], 1.4);
          const ballPoint = chartPoint(index, ball[index], 0.9);
          const wheelPoint = chartPoint(index, wheel[index], 0.9);
          return (
            <g className={horizon === selected ? "result-points is-selected" : "result-points"} key={horizon} onClick={() => onSelect(horizon)}>
              <rect className="hit-area" x={timingPoint.x - 70} y="35" width="140" height="230" />
              <rect className="timing-point" x={timingPoint.x - 5} y={timingPoint.y - 5} width="10" height="10" />
              <rect className="ball-point" x={ballPoint.x - 5} y={ballPoint.y - 5} width="10" height="10" />
              <rect className="wheel-point" x={wheelPoint.x - 4} y={wheelPoint.y - 4} width="8" height="8" />
              <text x={timingPoint.x - 20} y={timingPoint.y + (index === 0 ? 18 : -12)}>{timing[index].toFixed(2)}</text>
              <text x={ballPoint.x + (index === HORIZONS.length - 1 ? -9 : 9)} textAnchor={index === HORIZONS.length - 1 ? "end" : "start"} y={ballPoint.y - 9}>{ball[index].toFixed(3)}</text>
              <text x={wheelPoint.x + (index === HORIZONS.length - 1 ? -9 : 9)} textAnchor={index === HORIZONS.length - 1 ? "end" : "start"} y={wheelPoint.y - 9}>{wheel[index].toFixed(3)}</text>
              <text className="horizon-tick" x={timingPoint.x - 15} y="276">{HORIZON_RESULTS[horizon].seconds}s</text>
            </g>
          );
        })}

        <path className="result-crosshair" d={`M${crosshairX} 36V250`} />
        <g className="chart-legend" transform="translate(74 298)">
          <text x="0">■ DROP-OFF TIME</text><text x="180">□ BALL TRAJECTORY</text><text x="370">▫ WHEEL TRAJECTORY</text>
        </g>

        <g className="selected-results" transform="translate(866 48)">
          <text className="setting-label" x="0" y="0">{HORIZON_RESULTS[selected].seconds}s INPUT</text>
          <text className="result-large" x="0" y="42">{HORIZON_RESULTS[selected].seconds.toFixed(1)}s</text>
          <text x="0" y="63">observed</text>
          <path d="M0 80H120" />
          <text className="result-large" x="0" y="118">{(HORIZON_RESULTS[selected].timingMae / 50).toFixed(2)}s</text>
          <text x="0" y="139">timing MAE</text>
          <path d="M0 156H120" />
          <text className="result-large prediction" x="0" y="194">{HORIZON_RESULTS[selected].ballMae.toFixed(3)}</text>
          <text x="0" y="215">ball error (rad)</text>
          <path d="M0 232H120" />
          <text className="result-large" x="0" y="270">{HORIZON_RESULTS[selected].wheelMae.toFixed(3)}</text>
          <text x="0" y="291">wheel error (rad)</text>
        </g>
      </svg>

      <label className="horizon-scrubber">
        <span>Change how much of the spin the models see</span>
        <input
          type="range"
          min="0"
          max="4"
          step="1"
          value={selectedIndex}
          onChange={(event) => onSelect(HORIZONS[Number(event.target.value)])}
          aria-label="Observation horizon"
          aria-valuetext={`${HORIZON_RESULTS[selected].seconds} seconds`}
        />
      </label>
    </div>
  );
}

function FailureTrace({ runId, onReplay }: { runId: number; onReplay: () => void }) {
  return (
    <div className="failure-mode">
      <header><p>Where the forecasts break down</p><span>The difficult cases involve abrupt slowing or a ball hidden from view. A forecast can follow the earlier motion well and still miss what happens after that interruption.</span></header>
      <div className="failure-trace-wrap">
        <svg viewBox="0 0 720 210" role="img" aria-label="Example failure where predicted and actual trajectories diverge after occlusion">
          <path className="failure-grid" d="M20 26H700M20 96H700M20 166H700M20 26V166M360 26V166M700 26V166" />
          <rect className="occlusion-zone" x="456" y="26" width="72" height="140" />
          <text x="462" y="20">OCCLUSION</text>
          <path className="failure-observed" d="M20 140C110 126 180 102 270 94S392 81 456 74" />
          <g className="failure-run" key={runId}>
            <path className="failure-predicted" d="M456 74C520 68 608 61 700 58" />
            <path className="failure-actual" d="M456 74C515 82 548 116 584 139S654 166 700 172" />
            {[-18, -9, 8, 17].map((offset) => <path className="failure-ghost predicted" key={`p${offset}`} d={`M456 74C520 ${68 + offset * 0.4} 608 ${61 + offset} 700 ${58 + offset}`} />)}
            {[-14, -6, 9, 18].map((offset) => <path className="failure-ghost actual" key={`a${offset}`} d={`M456 74C515 ${82 + offset * 0.3} 548 ${116 + offset} 584 ${139 + offset}S654 ${166 + offset} 700 ${172 + offset}`} />)}
          </g>
          <text x="20" y="194">stable motion</text><text x="352" y="194">abrupt deceleration</text><text x="624" y="194">error tail</text>
        </svg>
      </div>
      <button type="button" onClick={onReplay}><span aria-hidden="true">▶</span> REPLAY ILLUSTRATION</button>
    </div>
  );
}

export function ResultsExplorer() {
  const [selected, setSelected] = useState<Horizon>(500);
  const [metric, setMetric] = useState<BaselineMetric>("trajectory");
  const [runId, setRunId] = useState(0);

  return (
    <section
      id="results"
      className="results-explorer page-gutter"
      aria-labelledby="results-title"
    >
      <header className="results-heading">
        <h2 id="results-title">The models learned<br />from the motion.</h2>
        <p>After six seconds of video, the ball model’s mean trajectory error was 0.185 radians—about 10.6°. That is 88% lower than simply keeping the last observed angle. Giving the models more of the spin improved all three predictions.</p>
      </header>

      <HorizonChart selected={selected} onSelect={setSelected} />

      <div className="results-lower">
        <div className="baseline-comparison">
          <header>
            <p>How much did the model improve?</p>
            <div role="group" aria-label="Baseline metric">
              <button type="button" onClick={() => setMetric("trajectory")} aria-pressed={metric === "trajectory"}>Whole trajectory</button>
              <button type="button" onClick={() => setMetric("drop-off")} aria-pressed={metric === "drop-off"}>At drop-off</button>
            </div>
          </header>
          <div className="baseline-bars">
            {BASELINES[metric].map((item) => (
              <div className={item.kind === "model" ? "is-model" : ""} key={item.label}>
                <span>{item.label}</span>
                <i style={{ "--bar-width": `${(item.value / 1.7) * 100}%` } as React.CSSProperties} />
                <output>{item.value.toFixed(3)}</output>
              </div>
            ))}
          </div>
          <p>The comparison is made after six seconds of observed motion. “Last-angle” keeps the last position; “Random” guesses an angle. The bars show mean error in radians, so shorter is better.</p>
        </div>

        <FailureTrace runId={runId} onReplay={() => setRunId((current) => current + 1)} />
      </div>

      <div className="scope-boundary">
        <h3>The full experiment<span>.</span></h3>
        <p>The project showed that video contains enough information to learn useful forecasts of roulette motion. Predicting the final pocket is a further problem: these experiments stop at drop-off. The dissertation covers the dataset, model choices, comparisons, and the cases that were hardest to predict.</p>
        <a className="text-link" href={site.project.pdf} target="_blank" rel="noreferrer">Read the methods and results <ArrowIcon /></a>
      </div>
    </section>
  );
}
