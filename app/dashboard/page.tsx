"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "../../src/database/browser-client";

interface Universe { id: string; name: string; description: string; is_public: boolean; updated_at: string; }
const nav = ["Overview", "Explore", "My Universes", "World Builder", "Simulation Studio", "Experiments", "Timeline Explorer", "Analytics"];

export default function DashboardPage() {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const session = await supabase.auth.getUser();
      if (!session.data.user) { window.location.assign("/login"); return; }
      setEmail(session.data.user.email ?? "researcher");
      const result = await supabase.from("universes").select("id,name,description,is_public,updated_at").order("updated_at", { ascending: false });
      if (result.error) setError(result.error.message); else setUniverses((result.data ?? []) as Universe[]);
      setLoading(false);
    }
    void load();
  }, []);

  async function signOut() { await createBrowserSupabaseClient().auth.signOut(); window.location.assign("/"); }

  return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">W</span> WORLDSEED</div><p className="nav-label">Laboratory</p>{nav.map((item, index) => <Link className={`nav-link ${index === 0 ? "active" : ""}`} href={item === "World Builder" ? "/world-builder" : "#"} key={item}>{item}</Link>)}<button className="nav-link" onClick={signOut} style={{ border: 0, background: "transparent", cursor: "pointer", textAlign: "left", width: "100%", marginTop: 24 }}>Sign out</button></aside><main className="main"><div className="topline"><div><div className="eyebrow">Research workspace / {email}</div><h1>Good morning, researcher.</h1><p className="lede">A quiet view of your artificial worlds. Start a run, inspect an outcome, or change the rules.</p></div><Link className="button" href="/world-builder">+ New universe</Link></div><div className="grid"><div className="stat"><div className="stat-label">Active universes</div><div className="stat-value">{loading ? "—" : universes.length}</div></div><div className="stat"><div className="stat-label">Running simulations</div><div className="stat-value">—</div></div><div className="stat"><div className="stat-label">Observed agents</div><div className="stat-value">—</div></div><div className="stat"><div className="stat-label">Compute hours</div><div className="stat-value">—</div></div></div><section className="card"><div className="card-heading"><h2>Your universes</h2><span className="tag">SUPABASE INDEX</span></div>{error && <p className="error">{error}</p>}{!loading && !error && universes.length === 0 && <div className="empty">No universes yet. Create your first artificial world to begin.</div>}{universes.map((universe) => <div className="universe-row" key={universe.id}><div><div className="universe-name">{universe.name}</div><div className="universe-meta">{universe.is_public ? "Public" : "Private"} · Updated {new Date(universe.updated_at).toLocaleDateString()}</div></div><span className="tag">READY</span></div>)}</section></main></div>;
}
