import Link from "next/link";

const chapters = [
  ["overview", "#overview"],
  ["dataset", "#dataset"],
  ["vision", "#vision"],
  ["model", "#training"],
  ["results", "#results"],
] as const;

export function RouletteHeader() {
  return (
    <header className="roulette-header page-gutter">
      <Link className="roulette-header-mark" href="/">arthur<span>.</span>sh</Link>
      <nav aria-label="Roulette case study chapters">
        {chapters.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
      </nav>
      <Link className="roulette-back" href="/#work">home <span aria-hidden="true">↗</span></Link>
    </header>
  );
}
