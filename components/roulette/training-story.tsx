"use client";

import { useEffect, useRef, useState } from "react";
import { TRAINING_PHASES } from "@/content/roulette-data";

const modelTasks = [
  { name: "DROP-OFF TIME", type: "sequence → scalar", units: "128 → 96", output: "t*" },
  { name: "BALL TRAJECTORY", type: "sequence → sequence", units: "128 / 128", output: "sin θ̂, cos θ̂" },
  { name: "WHEEL TRAJECTORY", type: "sequence → sequence", units: "128 / 128", output: "sin θ̂, cos θ̂" },
] as const;

export function TrainingStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [activeTask, setActiveTask] = useState(1);

  useEffect(() => {
    let animationFrame = 0;
    const update = () => {
      animationFrame = 0;
      const section = sectionRef.current;
      if (!section) return;
      const available = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, (window.scrollY - section.offsetTop) / available));
      const next = Math.min(TRAINING_PHASES.length - 1, Math.round(progress * TRAINING_PHASES.length));
      setActiveStage((current) => current === next ? current : next);
      if (progressRef.current) progressRef.current.style.transform = `scaleY(${progress})`;
    };
    const onScroll = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const scrollToStage = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    window.scrollTo({ top: section.offsetTop + index * window.innerHeight, behavior: "smooth" });
  };

  const phase = TRAINING_PHASES[activeStage];
  const task = modelTasks[activeTask];

  return (
    <section className="training-story case-checkpoint-story" id="training" ref={sectionRef} aria-labelledby="training-title">
      <div className="training-sticky page-gutter">
        <aside className="training-copy">
          <h2 id="training-title">Learning from<br />early motion.</h2>
          <p>Each model sees only the opening 2–10 seconds of a spin, then predicts one target.</p>
          <ol aria-label="Model training phases">
            {TRAINING_PHASES.map((item, index) => (
              <li className={index === activeStage ? "is-active" : index < activeStage ? "is-complete" : ""} key={item.key}>
                <button type="button" onClick={() => scrollToStage(index)} aria-current={index === activeStage ? "step" : undefined}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{item.label}<i />
                </button>
              </li>
            ))}
          </ol>
          <div className="training-phase-copy" aria-live="polite"><p>{phase.title}</p><span>{phase.body}</span></div>
        </aside>

        <div className={`training-canvas training-stage-${activeStage}`}>
          <header><span>MODEL DEVELOPMENT / {String(activeStage + 1).padStart(2, "0")}</span><strong>{phase.label}</strong></header>

          <div className="training-split" aria-label="Dataset split: 75 percent training, 12.5 percent validation, 12.5 percent test">
            <p>2,765 VALID SPINS</p>
            <div><i /><i /><i /></div>
            <dl><div><dt>TRAIN</dt><dd>75%</dd></div><div><dt>VALIDATE</dt><dd>12.5%</dd></div><div><dt>TEST</dt><dd>12.5%</dd></div></dl>
          </div>

          <div className="training-models">
            <div className="training-input"><span>INPUT</span><code>T × 11<br />features</code></div>
            <i />
            <div className="training-task-stack">
              {modelTasks.map((item, index) => (
                <button className={activeTask === index ? "is-active" : ""} key={item.name} type="button" onClick={() => setActiveTask(index)} onPointerEnter={() => setActiveTask(index)}>
                  <span>{item.name}</span><small>{item.type}</small>
                </button>
              ))}
            </div>
            <i />
            <div className="training-active-model">
              <span>{task.name}</span>
              <div><b>LSTM</b><small>{task.units} units</small></div>
              <i />
              <div><b>OUTPUT</b><small>{task.output}</small></div>
            </div>
          </div>

          <div className="training-run">
            <div className="loss-chart">
              <svg viewBox="0 0 560 190" role="img" aria-label="Training and validation loss falling before early stopping">
                <path className="training-grid" d="M32 16V158H542M32 54H542M32 96H542M32 134H542" />
                <path className="training-loss" d="M32 31C83 58 108 73 152 92S235 120 294 130 388 143 468 146 523 147 542 147" />
                <path className="validation-loss" d="M32 42C78 63 117 83 159 99S248 126 307 133 379 137 422 136 477 135 542 136" />
                <path className="early-stop-line" d="M468 16V158" />
                <text x="475" y="28">RESTORE BEST</text><text x="32" y="180">epoch 0</text><text x="486" y="180">early stop</text>
              </svg>
              <div><span>training loss</span><span>validation loss</span></div>
            </div>
            <dl>
              <div><dt>OPTIMISER</dt><dd>Adam</dd></div>
              <div><dt>BATCH</dt><dd>64</dd></div>
              <div><dt>TRAJECTORY LR</dt><dd>5e−4</dd></div>
              <div><dt>WEIGHT DECAY</dt><dd>1e−5</dd></div>
              <div><dt>EARLY STOPPING</dt><dd>10 epochs</dd></div>
            </dl>
          </div>

          <div className="training-search">
            <p>SEARCH SPACE AT T = 300</p>
            <div><span>25</span><small>configurations</small></div>
            <div><span>32–256</span><small>hidden units</small></div>
            <div><span>1–3</span><small>layers</small></div>
            <div><span>0.1–0.5</span><small>dropout</small></div>
            <footer>{[100, 200, 300, 400, 500].map((value) => <i className={value === 300 ? "is-active" : ""} key={value}>T={value}</i>)}</footer>
          </div>
        </div>

        <aside className="training-inspector">
          <header>SETUP</header>
          <dl>
            <div><dt>FRAME RATE</dt><dd>50 FPS</dd></div>
            <div><dt>INPUT HORIZONS</dt><dd>2–10s</dd></div>
            <div><dt>FEATURES / FRAME</dt><dd>11</dd></div>
            <div><dt>MAX EPOCHS</dt><dd>250</dd></div>
          </dl>
          <pre>{`{
  "target": "${activeTask === 0 ? "drop_time" : activeTask === 1 ? "ball_angle" : "wheel_angle"}",
  "known_future": "t*",
  "physics_rules": false,
  "test_leakage": false
}`}</pre>
          <p>The held-out test set is reserved for the final evaluation.</p>
          <a href="#results">See results <span aria-hidden="true">↓</span></a>
        </aside>

        <div className="case-progress-rail" aria-hidden="true"><span>{Math.round((activeStage / (TRAINING_PHASES.length - 1)) * 100)}%</span><i><b ref={progressRef} /></i><span>SCROLL</span></div>
      </div>
      <div className="case-scroll-checkpoints" aria-hidden="true">
        {TRAINING_PHASES.map((phase) => <i key={phase.key} />)}
      </div>
    </section>
  );
}
