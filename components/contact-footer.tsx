import { ArrowIcon } from "@/components/arrow-icon";
import { site } from "@/content/site";

const links = [
  { label: "GitHub", href: site.links.github },
  { label: "LinkedIn", href: site.links.linkedin },
] as const;

export function ContactFooter() {
  return (
    <footer className="site-footer page-gutter">
      <p className="footer-name">Arthur Robertson<span>.</span></p>
      <a className="footer-wordmark" href="#top">arthur.sh</a>
      <nav aria-label="External links">
        {links.map((link) => (
          <a key={link.label} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>
            {link.label} <ArrowIcon />
          </a>
        ))}
      </nav>
    </footer>
  );
}
