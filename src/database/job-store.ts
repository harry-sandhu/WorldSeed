import type { SupabaseClient } from "@supabase/supabase-js";
import type { JobId, JobStore, SimulationJob } from "../simulation-worker/index.js";
import type { SimulationState } from "../simulation-core/index.js";

interface RunRow {
  id: string;
  universe_id: string;
  status: SimulationJob["status"];
  config: SimulationJob["config"];
  seed: number;
  total_ticks: number;
  completed_ticks: number;
  checkpoint_every: number;
  max_attempts: number;
  attempt: number;
  lease_until: string | null;
  worker_id?: string;
  cancel_requested: boolean;
  error_message: string | null;
  checkpoint: { tick: number; state: SimulationState } | null;
}

function toJob(row: RunRow): SimulationJob {
  return {
    id: row.id,
    universeId: row.universe_id,
    config: row.config,
    totalTicks: row.total_ticks,
    checkpointEvery: row.checkpoint_every,
    maxAttempts: row.max_attempts,
    status: row.status,
    attempt: row.attempt,
    completedTicks: row.completed_ticks,
    leaseUntil: row.lease_until ? Date.parse(row.lease_until) : null,
    workerId: row.worker_id ?? null,
    cancelRequested: row.cancel_requested,
    error: row.error_message,
    checkpoint: row.checkpoint ? { tick: row.checkpoint.tick, state: row.checkpoint.state } : null
  };
}

export class SupabaseJobStore implements JobStore {
  public constructor(private readonly client: SupabaseClient) {}

  public async enqueue(job: SimulationJob): Promise<void> {
    const { error } = await this.client.from("simulation_runs").insert({
      id: job.id, universe_id: job.universeId, status: job.status, config: job.config,
      seed: job.config.seed, total_ticks: job.totalTicks, completed_ticks: job.completedTicks,
      checkpoint_every: job.checkpointEvery, max_attempts: job.maxAttempts, attempt: job.attempt,
      cancel_requested: job.cancelRequested
    });
    if (error) throw error;
  }

  public async claim(workerId: string, leaseMs: number, runId?: JobId): Promise<SimulationJob | null> {
    const { data, error } = await this.client.rpc("claim_simulation_run", { p_worker_id: workerId, p_lease_seconds: Math.ceil(leaseMs / 1000), p_run_id: runId ?? null }).single();
    if (error && error.code === "PGRST116") return null;
    if (error) throw error;
    if (!data) return null;
    const row = data as unknown as RunRow;
    const checkpoint = await this.latestCheckpoint(row.id);
    return toJob({ ...row, checkpoint });
  }

  public async save(job: SimulationJob): Promise<void> {
    const { error } = await this.client.from("simulation_runs").update({
      status: job.status, completed_ticks: job.completedTicks, lease_until: job.leaseUntil ? new Date(job.leaseUntil).toISOString() : null,
      worker_id: job.workerId, cancel_requested: job.cancelRequested, error_message: job.error
    }).eq("id", job.id);
    if (error) throw error;
    if (job.checkpoint) {
      const { tick, state } = job.checkpoint;
      const population = state.agents.filter((agent) => agent.alive).length;
      const checkpoint = await this.client.from("simulation_checkpoints").upsert({ run_id: job.id, tick, state, population }, { onConflict: "run_id,tick" });
      if (checkpoint.error) throw checkpoint.error;
      const summary = await this.client.from("simulation_run_summaries").upsert({
        run_id: job.id, tick, population,
        food: state.resources.food, water: state.resources.water, energy: state.resources.energy,
        updated_at: new Date().toISOString()
      }, { onConflict: "run_id" });
      if (summary.error) throw summary.error;
    }
  }

  public async get(jobId: JobId): Promise<SimulationJob | null> {
    const result = await this.client.from("simulation_runs").select("*").eq("id", jobId).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;
    const row = result.data as unknown as RunRow;
    return toJob({ ...row, checkpoint: await this.latestCheckpoint(jobId) });
  }

  public async requestCancellation(jobId: JobId): Promise<boolean> {
    const result = await this.client.from("simulation_runs").update({ cancel_requested: true }).eq("id", jobId).in("status", ["queued", "running"]).select("id");
    if (result.error) throw result.error;
    return result.data.length > 0;
  }

  private async latestCheckpoint(runId: string): Promise<RunRow["checkpoint"]> {
    const result = await this.client.from("simulation_checkpoints").select("tick,state").eq("run_id", runId).order("tick", { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw result.error;
    return (result.data as RunRow["checkpoint"] | null) ?? null;
  }
}
