import { describe, expect, it } from "vitest";
import { InMemoryJobStore } from "./memory-store.js";
import { SimulationWorker } from "./runner.js";
import type { SimulationJob } from "./types.js";
import type { SimulationConfig } from "../simulation-core/index.js";

const config: SimulationConfig = {
  seed: 7, tickRate: 10,
  world: { width: 10, height: 10, initialResources: { food: 100, water: 100, energy: 0 }, regeneration: { food: 1, water: 1, energy: 0 }, initialAgents: 2, reproductionAge: 4, reproductionEnergy: 70, maxAge: 100 }
};

function job(): SimulationJob {
  return { id: "job-1", universeId: "universe-1", config, totalTicks: 5, checkpointEvery: 2, maxAttempts: 2, status: "queued", attempt: 0, completedTicks: 0, leaseUntil: null, workerId: null, cancelRequested: false, error: null, checkpoint: null };
}

describe("SimulationWorker", () => {
  it("runs a leased job and persists checkpoints and progress", async () => {
    const store = new InMemoryJobStore();
    const progress: string[] = [];
    await store.enqueue(job());
    const worker = new SimulationWorker(store, { workerId: "worker-a", leaseMs: 10_000, onProgress: (update) => { progress.push(update.status); } });
    expect(await worker.runNext()).toBe(true);
    const result = await store.get("job-1");
    expect(result?.status).toBe("completed");
    expect(result?.completedTicks).toBe(5);
    expect(result?.checkpoint?.tick).toBe(5);
    expect(progress).toContain("completed");
  });

  it("honors cancellation between ticks", async () => {
    const store = new InMemoryJobStore();
    await store.enqueue(job());
    const worker = new SimulationWorker(store, { workerId: "worker-a", leaseMs: 10_000, onProgress: async (update) => {
      if (update.status === "running") await store.requestCancellation("job-1");
    } });
    await worker.runNext();
    expect((await store.get("job-1"))?.status).toBe("cancelled");
  });
});
