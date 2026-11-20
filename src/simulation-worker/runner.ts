import { SimulationEngine } from "../simulation-core/index.js";
import type { JobProgress, JobStore, WorkerOptions } from "./types.js";

export class SimulationWorker {
  public constructor(private readonly store: JobStore, private readonly options: WorkerOptions) {}

  public async runNext(): Promise<boolean> {
    const job = await this.store.claim(this.options.workerId, this.options.leaseMs);
    if (!job) return false;
    try {
      const engine = new SimulationEngine(job.config, job.checkpoint?.state);
      const remaining = job.totalTicks - job.completedTicks;
      for (let index = 0; index < remaining; index += 1) {
        const events = engine.step();
        job.completedTicks += 1;
        const shouldCheckpoint = job.completedTicks % job.checkpointEvery === 0 || job.completedTicks === job.totalTicks;
        if (shouldCheckpoint) {
          const current = await this.store.get(job.id);
          if (current?.cancelRequested) {
            job.status = "cancelled";
            job.leaseUntil = null;
            await this.store.save(job);
            await this.publish(job.id, job.completedTicks, job.totalTicks, "cancelled", []);
            return true;
          }
          job.checkpoint = engine.checkpoint();
          job.leaseUntil = Date.now() + this.options.leaseMs;
          await this.store.save(job);
          await this.publish(job.id, job.completedTicks, job.totalTicks, "running", events);
        }
      }
      job.status = "completed";
      job.leaseUntil = null;
      await this.store.save(job);
      await this.publish(job.id, job.completedTicks, job.totalTicks, "completed", []);
    } catch (error) {
      job.error = error instanceof Error ? error.message : String(error);
      job.leaseUntil = null;
      job.status = job.attempt < job.maxAttempts ? "queued" : "failed";
      await this.store.save(job);
      await this.publish(job.id, job.completedTicks, job.totalTicks, job.status, []);
    }
    return true;
  }

  private async publish(jobId: string, completedTicks: number, totalTicks: number, status: JobProgress["status"], latestEvents: JobProgress["latestEvents"]): Promise<void> {
    await this.options.onProgress?.({ jobId, completedTicks, totalTicks, status, latestEvents });
  }
}
