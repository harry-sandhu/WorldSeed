import type { JobId, JobStore, SimulationJob } from "./types.js";

/** Test/development adapter. Production should implement JobStore with atomic SQL claiming. */
export class InMemoryJobStore implements JobStore {
  private readonly jobs = new Map<JobId, SimulationJob>();

  public async enqueue(job: SimulationJob): Promise<void> { this.jobs.set(job.id, structuredClone(job)); }

  public async claim(workerId: string, leaseMs: number, runId?: JobId): Promise<SimulationJob | null> {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      const leaseExpired = job.leaseUntil !== null && job.leaseUntil <= now;
      if ((!runId || job.id === runId) && (job.status === "queued" || (job.status === "running" && leaseExpired)) && job.attempt < job.maxAttempts) {
        job.status = "running";
        job.attempt += 1;
        job.leaseUntil = now + leaseMs;
        job.error = null;
        job.workerId = workerId;
        return structuredClone(job);
      }
    }
    return null;
  }

  public async save(job: SimulationJob): Promise<void> { this.jobs.set(job.id, structuredClone(job)); }
  public async get(jobId: JobId): Promise<SimulationJob | null> {
    const job = this.jobs.get(jobId);
    return job ? structuredClone(job) : null;
  }
  public async requestCancellation(jobId: JobId): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || ["completed", "cancelled", "failed"].includes(job.status)) return false;
    job.cancelRequested = true;
    return true;
  }
}
