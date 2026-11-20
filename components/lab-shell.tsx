"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [["Overview", "/dashboard"], ["Explore", "/explore"], ["My universes", "/my-universes"], ["World builder", "/world-builder"], ["Simulation studio", "/simulation-studio"], ["Experiments", "/experiments"], ["Timeline explorer", "/timeline-explorer"], ["Analytics", "/analytics"]] as const;

export function LabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark">W</span> WorldSeed</Link><p className="nav-label">Register</p>{sections.map(([label, href]) => <Link className={`nav-link ${pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""}`} href={href} key={label}>{label}</Link>)}</aside>{children}</div>;
}
