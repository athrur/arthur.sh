"use client";

import { motion, useReducedMotion } from "motion/react";
import { ScrollChapters } from "@/components/roulette/scroll-chapters";
import { CONDITION_RESULTS, TRAINING_PHASES } from "@/content/roulette-data";

const modelTasks = [
  { name: "WHEN THE BALL DROPS", type: "Motion in → time out", units: "128 → 96", output: "t*" },
  { name: "WHERE THE BALL MOVES", type: "Motion in → future positions out", units: "128 / 128", output: "sin θ̂, cos θ̂" },
  { name: "HOW THE WHEEL TURNS", type: "Motion in → future positions out", units: "128 / 128", output: "sin θ̂, cos θ̂" },
] as const;

export function TrainingStory() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="roulette-scroll-story page-gutter" id="training" aria-labelledby="training-title">
      <header className="scroll-story-heading">
        <h2 id="training-title">Teaching a model<br />to follow the spin.</h2>
        <p>With the tracks in place, I could test the original question. I gave the models only the first 2–10 seconds of each spin and asked them to predict the motion that followed, up to the moment the ball left the rim.</p>
      </header>
      <ScrollChapters chapters={TRAINING_PHASES} name="training">
        {(activeStage) => <div className={`training-canvas training-stage-${activeStage}`}>
          <div inert={activeStage !== 0} className="training-split" aria-label="Dataset split: 75 percent training, 12.5 percent validation, 12.5 percent test">
            <p>2,765 SPINS, DIVIDED BY PURPOSE</p>
            <div key={activeStage}>{[0, 1, 2].map((index) => <motion.i key={index} initial={false} whileInView={{ scaleY: reduceMotion ? 1 : [0, 1] }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reduceMotion ? 0 : 0.65, delay: reduceMotion ? 0 : index * 0.09 }} style={{ transformOrigin: "bottom" }} />)}</div>
            <dl><div><dt>TRAIN</dt><dd>75%</dd></div><div><dt>VALIDATE</dt><dd>12.5%</dd></div><div><dt>TEST</dt><dd>12.5%</dd></div></dl>
          </div>

          <div inert={activeStage !== 1} className="training-models training-model-overview">
            <p>11 motion features per frame</p>
            {modelTasks.map((task) => <div className="training-model-card" key={task.name}>
              <span>{task.name}</span>
              <strong>LSTM <small>{task.units} units</small></strong>
              <p>{task.type}</p>
              <code>{task.output}</code>
            </div>)}
          </div>

          <div inert={activeStage !== 2} className="training-run">
            <div className="loss-chart">
              <svg viewBox="0 0 560 190" role="img" aria-label="Training and validation loss falling before early stopping">
                <path className="training-grid" d="M32 16V158H542M32 54H542M32 96H542M32 134H542" />
                <path className="training-loss" d="M32 31C83 58 108 73 152 92S235 120 294 130 388 143 468 146 523 147 542 147" />
                <path className="validation-loss" d="M32 42C78 63 117 83 159 99S248 126 307 133 379 137 422 136 477 135 542 136" />
                <path className="early-stop-line" d="M468 16V158" />
                <text x="475" y="28">RESTORE BEST</text><text x="32" y="180">epoch 0</text><text x="486" y="180">early stop</text>
              </svg>
              <div><span>training loss</span><span>validation loss</span></div><p className="diagram-caption">An illustration of early stopping: keep the model that performs best on validation data, rather than simply training for longer.</p>
            </div>
            <dl>
              <div><dt>OPTIMISER</dt><dd>Adam</dd></div>
              <div><dt>BATCH</dt><dd>64</dd></div>
              <div><dt>TRAJECTORY LR</dt><dd>5e−4</dd></div>
              <div><dt>WEIGHT DECAY</dt><dd>1e−5</dd></div>
              <div><dt>EARLY STOPPING</dt><dd>10 epochs</dd></div>
            </dl>
          </div>

          <div inert={activeStage !== 3} className="training-search training-ablation">
            <p>WHAT HAPPENS WHEN THE INPUT CHANGES?</p>
            <h3>Motion features made a substantial difference.</h3>
            {Object.entries(CONDITION_RESULTS).map(([key, result]) => (
              <div className="ablation-row" key={key}>
                <span>{key === "full" ? "All motion features" : key === "noise" ? "With added noise" : "Without angular features"}</span>
                <strong>{result.ballMae.toFixed(3)} <small>rad</small></strong>
                <i><motion.b key={`${activeStage}-${key}`} initial={{ scaleX: result.ballMae / 1.2 }} whileInView={{ scaleX: reduceMotion ? result.ballMae / 1.2 : [0, result.ballMae / 1.2] }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : 0.1 }} /></i>
              </div>
            ))}
            <p className="diagram-caption">Ball-trajectory error after six seconds of video. Removing the derived angular features increased the error from 0.185 to 1.179 radians.</p>
          </div>
        </div>}
      </ScrollChapters>

        <aside className="training-inspector scroll-training-notes">
          <header>WHAT THE MODELS RECEIVE</header>
          <dl>
            <div><dt>FRAME RATE</dt><dd>50 FPS</dd></div>
            <div><dt>VIDEO OBSERVED</dt><dd>2–10s</dd></div>
            <div><dt>FEATURES / FRAME</dt><dd>11</dd></div>
            <div><dt>MAX EPOCHS</dt><dd>250</dd></div>
          </dl>
          <p>Every frame supplies 11 features describing the motion. Angles are represented as sine and cosine, so crossing from 359° to 1° looks like a small movement rather than a full revolution.</p>
          <p>The test spins stay out of training and model selection. They are where the forecasts have to prove themselves.</p>
          <a href="#results">See how they performed <span aria-hidden="true">↓</span></a>
        </aside>

    </section>
  );
}
