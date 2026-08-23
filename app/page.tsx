import { Hero } from "@/components/hero";
import { FeaturedWork } from "@/components/featured-work";
import { site } from "@/content/site";

export default function Home() {
  return (
    <main className="home-shell">
      <Hero />
      <FeaturedWork />
      <footer className="home-footer page-gutter">
        <span>Arthur Robertson</span>
        <nav aria-label="External links">
          <a href={site.links.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={site.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
        </nav>
      </footer>
    </main>
  );
}
