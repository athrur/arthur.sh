import { site } from "@/content/site";

function point(angle: number, radius: number) {
  return {
    x: Number((260 + Math.cos(angle) * radius).toFixed(3)),
    y: Number((260 + Math.sin(angle) * radius).toFixed(3)),
  };
}

const pockets = Array.from({ length: 37 }, (_, index) => {
  const angle = index * Math.PI * 2 / 37;
  const inner = point(angle, 134);
  const outer = point(angle, 162);
  return `M${inner.x} ${inner.y}L${outer.x} ${outer.y}`;
});

const trail = Array.from({ length: 24 }, (_, index) => {
  const start = point((-72 + index * 3) * Math.PI / 180, 190);
  const end = point((-69 + index * 3) * Math.PI / 180, 190);
  return { path: `M${start.x} ${start.y}A190 190 0 0 1 ${end.x} ${end.y}`, opacity: (index + 1) / 24 * 0.75 };
});

function LoopingWheel() {
  return (
    <div className="roulette-landing-wheel" aria-hidden="true">
      <svg viewBox="0 0 520 520" focusable="false">
        <g className="landing-wheel-rings">
          <circle cx="260" cy="260" r="215" />
          <circle cx="260" cy="260" r="190" />
          <circle cx="260" cy="260" r="162" />
          <circle cx="260" cy="260" r="134" />
          <circle cx="260" cy="260" r="30" />
        </g>
        <g className="landing-wheel-rotor">
          {pockets.map((path, index) => <path d={path} key={index} />)}
          <path className="landing-wheel-zero" d="M394 260H422" />
          <path d="M245 260H275M260 245V275" />
        </g>
        <g className="landing-wheel-orbit">
          {trail.map((segment, index) => <path className="landing-wheel-trail" d={segment.path} opacity={segment.opacity} key={index} />)}
          <circle className="landing-wheel-ball" cx="450" cy="260" r="6" />
        </g>
      </svg>
    </div>
  );
}

export function RouletteHero() {
  return (
    <section className="roulette-hero page-gutter" id="overview" aria-labelledby="roulette-title">
      <div className="roulette-hero-copy">
        <h1 id="roulette-title">Predicting roulette<br />from video.</h1>
        <div>
          <p>How much of a roulette spin can you predict from a few seconds of video?</p>
          <p>I built a computer vision system to follow the ball and wheel, assembled a dataset of 2,765 spins, and trained three neural networks to forecast their motion. The models learned enough to substantially outperform the simple baselines.</p>
        </div>
        <a className="roulette-primary-link" href={site.project.pdf} target="_blank" rel="noreferrer">Read the dissertation <span aria-hidden="true">↗</span></a>
      </div>
      <LoopingWheel />
      <a className="hero-story-link" href="#dataset">How I built it <span aria-hidden="true">↓</span></a>
    </section>
  );
}
