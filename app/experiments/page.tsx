"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LabShell } from "../../components/lab-shell";
import { createBrowserSupabaseClient } from "../../src/database/browser-client";

const PAGE_SIZE = 25;

interface Run { id: string; status: string; seed: number; total_ticks: number; completed_ticks: number; created_at: string; }
interface Checkpoint { run_id: string; tick: number; state: { agents?: { alive?: boolean }[]; resources?: { food?: number; water?: number; energy?: number } }; }

function average(values: number[]): number { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function median(values: number[]): number { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] ?? 0 : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2; }
function deviation(values: number[]): number { const mean = average(values); return values.length ? Math.sqrt(average(values.map((value) => (value - mean) ** 2))) : 0; }

async function loadCheckpointsFor(runs: Run[]): Promise<Checkpoint[]> {
  if (!runs.length) return [];
  const result = await createBrowserSupabaseClient().from("simulation_checkpoints").select("run_id,tick,state").in("run_id", runs.map((run) => run.id)).order("tick", { ascending: false }).limit(1000);
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as Checkpoint[];
}

export default function ExperimentsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createBrowserSupabaseClient();
      const auth = await supabase.auth.getUser();
      if (!auth.data.user) { window.location.assign("/login"); return; }
      const runResult = await supabase.from("simulation_runs").select("id,status,seed,total_ticks,completed_ticks,created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(PAGE_SIZE);
      if (runResult.error) { setError(runResult.error.message); setLoading(false); return; }
      const list = (runResult.data ?? []) as Run[];
      setRuns(list);
      setHasMore(list.length === PAGE_SIZE);
      try { setCheckpoints(await loadCheckpointsFor(list)); } catch (checkpointError) { setError((checkpointError as Error).message); }
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
    const runResult = await supabase.from("simulation_runs").select("id,status,seed,total_ticks,completed_ticks,created_at").eq("status", "completed").lt("created_at", last.created_at).order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (runResult.error) { setError(runResult.error.message); setLoadingMore(false); return; }
    const nextPage = (runResult.data ?? []) as Run[];
    setRuns((current) => [...current, ...nextPage]);
    setHasMore(nextPage.length === PAGE_SIZE);
    try { const more = await loadCheckpointsFor(nextPage); setCheckpoints((current) => [...current, ...more]); } catch (checkpointError) { setError((checkpointError as Error).message); }
    setLoadingMore(false);
  }, [runs]);

  const finalByRun = useMemo(() => { const result = new Map<string, Checkpoint>(); for (const checkpoint of checkpoints) if (!result.has(checkpoint.run_id)) result.set(checkpoint.run_id, checkpoint); return result; }, [checkpoints]);
  const selectedCheckpoints = selected.map((id) => finalByRun.get(id)).filter((checkpoint): checkpoint is Checkpoint => Boolean(checkpoint)); const populations = selectedCheckpoints.map((checkpoint) => checkpoint.state.agents?.filter((agent) => agent.alive !== false).length ?? 0); const food = selectedCheckpoints.map((checkpoint) => checkpoint.state.resources?.food ?? 0);
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  return <LabShell><main className="main"><div className="topline"><div><div className="eyebrow">Side-by-side</div><h1>Compare outcomes.</h1><p className="lede">Select completed seeded runs and compare summaries from their final persisted checkpoints.</p></div><Link className="button secondary" href="/simulation-studio">Run another scenario</Link></div>{error && <p className="error">{error}</p>}<section className="card"><div className="card-heading"><h2>Completed runs</h2><span className="tag">{runs.length}{hasMore ? "+" : ""} entries</span></div>{!loading && runs.length === 0 && <div className="empty">Complete multiple runs to compare outcomes here.</div>}{runs.map((run) => <label className="universe-row" key={run.id} style={{ cursor: "pointer" }}><div><div className="universe-name mono">{run.id.slice(0, 8)}</div><div className="universe-meta">Seed {run.seed}, {run.completed_ticks}/{run.total_ticks} ticks, final checkpoint {finalByRun.get(run.id)?.tick ?? "—"}</div></div><input type="checkbox" checked={selected.includes(run.id)} onChange={() => toggle(run.id)} /></label>)}{hasMore && <button className="button secondary" disabled={loadingMore} onClick={() => void loadMore()} style={{ marginTop: 12 }}>{loadingMore ? "Loading…" : "Load more"}</button>}</section><section className="card"><div className="card-heading"><h2>Statistical summary</h2><span className="tag">{selected.length} selected</span></div>{!selected.length ? <div className="empty">Select at least one completed run.</div> : <div className="grid"><div className="stat"><div className="stat-label">Population mean</div><div className="stat-value">{average(populations).toFixed(1)}</div></div><div className="stat"><div className="stat-label">Population median</div><div className="stat-value">{median(populations).toFixed(1)}</div></div><div className="stat"><div className="stat-label">Population std dev</div><div className="stat-value">{deviation(populations).toFixed(1)}</div></div><div className="stat"><div className="stat-label">Food mean</div><div className="stat-value">{average(food).toFixed(1)}</div></div></div>}</section></main></LabShell>;
}
