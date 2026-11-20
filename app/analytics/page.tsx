"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { LabShell } from "../../components/lab-shell";
import { createBrowserSupabaseClient } from "../../src/database/browser-client";

const PAGE_SIZE = 25;

interface Run { id: string; status: string; total_ticks: number; completed_ticks: number; created_at: string; }
interface Checkpoint { run_id: string; tick: number; state: { agents?: { alive?: boolean }[]; resources?: { food?: number; water?: number; energy?: number } }; }

async function loadCheckpointsFor(runs: Run[]): Promise<Checkpoint[]> {
  if (!runs.length) return [];
  const result = await createBrowserSupabaseClient().from("simulation_checkpoints").select("run_id,tick,state").in("run_id", runs.map((run) => run.id)).order("tick", { ascending: true }).limit(2000);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Checkpoint[];
}

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [points, setPoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) { window.location.assign("/login"); return; }
      const runResult = await supabase.from("simulation_runs").select("id,status,total_ticks,completed_ticks,created_at").order("created_at", { ascending: false }).limit(PAGE_SIZE);
      if (runResult.error) { setError(runResult.error.message); setLoading(false); return; }
      const currentRuns = (runResult.data ?? []) as Run[];
      setRuns(currentRuns);
      setHasMore(currentRuns.length === PAGE_SIZE);
      try { setPoints(await loadCheckpointsFor(currentRuns)); } catch (checkpointError) { setError((checkpointError as Error).message); }
      setLoading(false);
    }
    void load();
  }, []);

  const loadMore = useCallback(async () => {
    const last = runs[runs.length - 1];
    if (!last) return;
    setLoadingMore(true);
    setError("");
    const supabase = createBrowserSupabaseClient();
    const runResult = await supabase.from("simulation_runs").select("id,status,total_ticks,completed_ticks,created_at").lt("created_at", last.created_at).order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (runResult.error) { setError(runResult.error.message); setLoadingMore(false); return; }
    const nextPage = (runResult.data ?? []) as Run[];
    setRuns((current) => [...current, ...nextPage]);
    setHasMore(nextPage.length === PAGE_SIZE);
    try { const more = await loadCheckpointsFor(nextPage); setPoints((current) => [...current, ...more].sort((a, b) => a.tick - b.tick)); } catch (checkpointError) { setError((checkpointError as Error).message); }
    setLoadingMore(false);
  }, [runs]);

  const living = points.map((point) => point.state.agents?.filter((agent) => agent.alive !== false).length ?? 0); const maxPopulation = Math.max(1, ...living); const latest = points.length ? points[points.length - 1] : null; const completed = runs.filter((run) => run.status === "completed").length;
  return <LabShell><main className="main"><div className="topline"><div><div className="eyebrow">Observatory / evidence</div><h1>Read the evidence.</h1><p className="lede">Population and resource summaries derived from persisted simulation checkpoints.</p></div><Link className="button" href="/simulation-studio">Run an experiment</Link></div>{error && <p className="error">{error}</p>}<div className="grid"><div className="stat"><div className="stat-label">Runs observed</div><div className="stat-value">{loading ? "—" : `${runs.length}${hasMore ? "+" : ""}`}</div></div><div className="stat"><div className="stat-label">Completed runs</div><div className="stat-value">{loading ? "—" : completed}</div></div><div className="stat"><div className="stat-label">Latest population</div><div className="stat-value">{loading ? "—" : latest ? latest.state.agents?.filter((agent) => agent.alive !== false).length ?? 0 : 0}</div></div><div className="stat"><div className="stat-label">Latest tick</div><div className="stat-value">{loading ? "—" : latest?.tick ?? 0}</div></div></div><div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 1fr)" }}><section className="card"><div className="card-heading"><h2>Population over checkpoints</h2><span className="tag">DERIVED</span></div>{!loading && points.length === 0 && <div className="empty">Complete a run to create analytics checkpoints.</div>}{points.length > 0 && <div style={{ display: "flex", alignItems: "end", gap: 3, height: 220, paddingTop: 20 }}>{points.slice(-80).map((point) => { const count = point.state.agents?.filter((agent) => agent.alive !== false).length ?? 0; return <div key={`${point.run_id}-${point.tick}`} title={`Tick ${point.tick}: ${count} agents`} style={{ flex: 1, minWidth: 2, height: `${Math.max(3, (count / maxPopulation) * 100)}%`, background: "var(--cyan)", opacity: .75 }} />; })}</div>}{hasMore && <button className="button secondary" disabled={loadingMore} onClick={() => void loadMore()} style={{ marginTop: 12 }}>{loadingMore ? "Loading…" : "Load more runs"}</button>}</section><section className="card"><div className="card-heading"><h2>Latest resources</h2><span className="tag">TICK {latest?.tick ?? "—"}</span></div>{latest ? <>{["food", "water", "energy"].map((resource) => <div className="universe-row" key={resource}><span className="universe-name">{resource}</span><span className="mono">{Math.round(latest.state.resources?.[resource as "food" | "water" | "energy"] ?? 0)}</span></div>)}</> : <div className="empty">No checkpoint resources yet.</div>}</section></div></main></LabShell>;
}
