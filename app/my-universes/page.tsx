"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LabShell } from "../../components/lab-shell";
import { createBrowserSupabaseClient } from "../../src/database/browser-client";

const PAGE_SIZE = 25;
const UNIVERSE_COLUMNS = "id,name,description,is_public,updated_at";

interface Universe { id: string; name: string; description: string; is_public: boolean; updated_at: string; }
interface Run { universe_id: string; status: string; }

async function loadRunsFor(universes: Universe[]): Promise<Run[]> {
  if (!universes.length) return [];
  const result = await createBrowserSupabaseClient().from("simulation_runs").select("universe_id,status").in("universe_id", universes.map((universe) => universe.id));
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Run[];
}

export default function MyUniversesPage() {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) { window.location.assign("/login"); return; }
      const universeResult = await supabase.from("universes").select(UNIVERSE_COLUMNS).order("updated_at", { ascending: false }).limit(PAGE_SIZE);
      if (universeResult.error) { setError(universeResult.error.message); setLoading(false); return; }
      const list = (universeResult.data ?? []) as Universe[];
      setUniverses(list);
      setHasMore(list.length === PAGE_SIZE);
      try { setRuns(await loadRunsFor(list)); } catch (runError) { setError((runError as Error).message); }
      setLoading(false);
    }
    void load();
  }, []);

  const loadMore = useCallback(async () => {
    const last = universes[universes.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setError("");
    const supabase = createBrowserSupabaseClient();
    const universeResult = await supabase.from("universes").select(UNIVERSE_COLUMNS).lt("updated_at", last.updated_at).order("updated_at", { ascending: false }).limit(PAGE_SIZE);
    if (universeResult.error) { setError(universeResult.error.message); setLoadingMore(false); return; }
    const nextPage = (universeResult.data ?? []) as Universe[];
    setUniverses((current) => [...current, ...nextPage]);
    setHasMore(nextPage.length === PAGE_SIZE);
    try { const more = await loadRunsFor(nextPage); setRuns((current) => [...current, ...more]); } catch (runError) { setError((runError as Error).message); }
    setLoadingMore(false);
  }, [universes]);

  async function togglePublic(universe: Universe) { const result = await createBrowserSupabaseClient().from("universes").update({ is_public: !universe.is_public }).eq("id", universe.id); if (result.error) setError(result.error.message); else setUniverses((current) => current.map((item) => item.id === universe.id ? { ...item, is_public: !item.is_public } : item)); }
  const visible = universes.filter((universe) => `${universe.name} ${universe.description}`.toLowerCase().includes(query.toLowerCase()));
  return <LabShell><main className="main"><div className="topline"><div><div className="eyebrow">Research library / universes</div><h1>Your universes.</h1><p className="lede">Manage worlds, inspect their runs, and decide what to share with the wider research community.</p></div><Link className="button" href="/world-builder">+ New universe</Link></div><section className="card"><div className="card-heading"><h2>Universe library</h2><span className="tag">{universes.length}{hasMore ? "+" : ""} WORLDS</span></div><input placeholder="Search universes…" value={query} onChange={(event) => setQuery(event.target.value)} style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 4, padding: 12, background: "var(--bg)", color: "var(--text)", marginBottom: 14 }} />{error && <p className="error">{error}</p>}{loading && <div className="empty">Loading universes…</div>}{!loading && !visible.length && <div className="empty">No matching universes.</div>}{visible.map((universe) => { const universeRuns = runs.filter((run) => run.universe_id === universe.id); const running = universeRuns.filter((run) => run.status === "running" || run.status === "queued").length; return <div className="universe-row" key={universe.id}><div style={{ flex: 1 }}><div className="universe-name">{universe.name}</div><div className="universe-meta">{universe.is_public ? "Public" : "Private"} · {universeRuns.length} runs · {running} active · updated {new Date(universe.updated_at).toLocaleDateString()}</div><p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0 0" }}>{universe.description || "No research note."}</p></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="button secondary" onClick={() => void togglePublic(universe)}>{universe.is_public ? "Make private" : "Publish"}</button><Link className="tag" href={`/simulation-studio?universe=${universe.id}`}>OPEN →</Link></div></div>; })}{hasMore && <button className="button secondary" disabled={loadingMore} onClick={() => void loadMore()} style={{ marginTop: 12 }}>{loadingMore ? "Loading…" : "Load more"}</button>}</section></main></LabShell>;
}
