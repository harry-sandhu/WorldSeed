"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [["Overview", "/dashboard"], ["Explore", "/explore"], ["My Universes", "/my-universes"], ["World Builder", "/world-builder"], ["Simulation Studio", "/simulation-studio"], ["Experiments", "/experiments"], ["Timeline Explorer", "/timeline-explorer"], ["Analytics", "/analytics"]] as const;

export function LabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell"><aside className="sidebar"><Link className="brand" href="/dashboard"><span className="brand-mark">W</span> WORLDSEED</Link><p className="nav-label">Laboratory</p>{sections.map(([label, href]) => <Link className={`nav-link ${pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""}`} href={href} key={label}>{label}</Link>)}</aside>{children}</div>;
}
