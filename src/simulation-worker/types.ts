import type { Checkpoint, SimulationConfig, SimulationEvent } from "../simulation-core/index.js";

export type JobId = string;
export type JobStatus = "queued" | "running" | "completed" | "cancelled" | "failed";

export interface SimulationJob {
  readonly id: JobId;
  readonly universeId: string;
  readonly config: SimulationConfig;
  readonly totalTicks: number;
  readonly checkpointEvery: number;
  readonly maxAttempts: number;
  status: JobStatus;
  attempt: number;
  completedTicks: number;
  leaseUntil: number | null;
  workerId: string | null;
  cancelRequested: boolean;
  error: string | null;
  checkpoint: Checkpoint | null;
}

export interface JobProgress {
  readonly jobId: JobId;
  readonly completedTicks: number;
  readonly totalTicks: number;
  readonly status: JobStatus;
  readonly latestEvents: readonly SimulationEvent[];
}

export interface JobStore {
  enqueue(job: SimulationJob): Promise<void>;
  claim(workerId: string, leaseMs: number, runId?: JobId): Promise<SimulationJob | null>;
  save(job: SimulationJob): Promise<void>;
  get(jobId: JobId): Promise<SimulationJob | null>;
  requestCancellation(jobId: JobId): Promise<boolean>;
}

export interface WorkerOptions {
  readonly workerId: string;
  readonly leaseMs: number;
  readonly runId?: JobId;
  readonly onProgress?: (progress: JobProgress) => Promise<void> | void;
}
