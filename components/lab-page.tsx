import Link from "next/link";

const sections = [["Overview", "/dashboard"], ["Explore", "/explore"], ["My Universes", "/my-universes"], ["World Builder", "/world-builder"], ["Simulation Studio", "/simulation-studio"], ["Experiments", "/experiments"], ["Timeline Explorer", "/timeline-explorer"], ["Analytics", "/analytics"]] as const;

export function LabPage({ active, eyebrow, title, description, action, actionHref }: { active: string; eyebrow: string; title: string; description: string; action?: string; actionHref?: string }) {
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark">W</span> WORLDSEED</Link><p className="nav-label">Laboratory</p>{sections.map(([label, href]) => <Link className={`nav-link ${label === active ? "active" : ""}`} href={href} key={label}>{label}</Link>)}</aside><main className="main"><div className="topline"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lede">{description}</p></div>{action && actionHref && <Link className="button" href={actionHref}>{action}</Link>}</div><section className="card"><div className="card-heading"><h2>{title}</h2><span className="tag">WORLDSEED</span></div><div className="empty">This workspace is connected to your Supabase project and ready for the next experiment.</div></section></main></div>;
}
