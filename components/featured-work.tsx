import Link from "next/link";
import { site } from "@/content/site";

export function FeaturedWork() {
  return (
    <section className="home-project page-gutter" id="work" aria-label="Project">
      <span>01 / Project</span>
      <Link href="/work/predicting-roulette">
        {site.project.title} <i aria-hidden="true">→</i>
      </Link>
    </section>
  );
}
