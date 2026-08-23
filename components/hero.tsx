import { site } from "@/content/site";

function SignalField() {
  return (
    <svg className="home-signal-field" viewBox="0 0 600 340" aria-hidden="true">
      <g className="home-signal-grid">
        <path d="M28 72H572M28 170H572M28 268H572" />
        <path d="M96 30V310M232 30V310M368 30V310M504 30V310" />
      </g>
      <g className="home-signal-wave home-signal-wave-one">
        <path d="M4 188C54 188 68 112 119 112S183 230 232 230 294 92 347 92 407 205 462 205 521 135 596 135" />
      </g>
      <g className="home-signal-wave home-signal-wave-two">
        <path d="M4 206C47 206 77 174 119 174S190 130 232 130 307 252 347 252 418 145 462 145 529 211 596 211" />
      </g>
      <path className="home-signal-active" d="M4 188C54 188 68 112 119 112S183 230 232 230 294 92 347 92 407 205 462 205 521 135 596 135" />
      <circle className="home-signal-marker" cx="347" cy="92" r="5" />
    </svg>
  );
}

export function Hero() {
  return (
    <section className="home-hero" id="top" aria-labelledby="hero-title">
      <header className="home-header page-gutter">
        <a className="home-wordmark" href="#top" aria-label="arthur.sh, back to top">arthur.sh</a>
        <nav aria-label="External links">
          <a href={site.links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={site.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
        </nav>
      </header>

      <div className="home-hero-layout page-gutter">
        <div className="home-copy">
          <h1 id="hero-title"><span>Arthur</span><span>Robertson</span></h1>
          <p>{site.role}</p>
        </div>
        <SignalField />
      </div>
    </section>
  );
}
