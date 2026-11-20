import Link from "next/link";

const sections = [["Overview", "/dashboard"], ["Explore", "/explore"], ["My universes", "/my-universes"], ["World builder", "/world-builder"], ["Simulation studio", "/simulation-studio"], ["Experiments", "/experiments"], ["Timeline explorer", "/timeline-explorer"], ["Analytics", "/analytics"]] as const;

export function LabPage({ active, eyebrow, title, description, action, actionHref }: { active: string; eyebrow: string; title: string; description: string; action?: string; actionHref?: string }) {
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark">W</span> WorldSeed</Link><p className="nav-label">Register</p>{sections.map(([label, href]) => <Link className={`nav-link ${label === active ? "active" : ""}`} href={href} key={label}>{label}</Link>)}</aside><main className="main"><div className="topline"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lede">{description}</p></div>{action && actionHref && <Link className="button" href={actionHref}>{action}</Link>}</div><section className="card"><div className="card-heading"><h2>{title}</h2></div><div className="empty">Nothing recorded here yet.</div></section></main></div>;
}
