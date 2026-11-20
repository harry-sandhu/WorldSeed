import "dotenv/config";
import { createWorkerSupabaseClient } from "../database/client.js";
import { SupabaseJobStore } from "../database/job-store.js";
import { SimulationWorker } from "./runner.js";

const workerId = process.env.WORLDSEED_WORKER_ID ?? `local-${process.pid}`;
const runIdIndex = process.argv.indexOf("--run-id");
const runId = runIdIndex >= 0 ? process.argv[runIdIndex + 1] : undefined;
const store = new SupabaseJobStore(createWorkerSupabaseClient());
const workerOptions = {
  workerId,
  leaseMs: 60_000,
  onProgress: (progress: { jobId: string; status: string; completedTicks: number; totalTicks: number }) => console.log(`[${progress.jobId}] ${progress.status} ${progress.completedTicks}/${progress.totalTicks}`)
};
const worker = new SimulationWorker(store, runId ? { ...workerOptions, runId } : workerOptions);

async function runOnce(): Promise<void> {
  const claimed = await worker.runNext();
  if (!claimed) console.log(runId ? `No queued run found for ${runId}.` : "No queued simulation runs.");
}

async function runLoop(): Promise<void> {
  for (;;) {
    await runOnce();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const main = process.argv.includes("--loop") ? runLoop : runOnce;
void main().catch((error: unknown) => {
  console.error("Worker failed:", error instanceof Error ? error.message : JSON.stringify(error));
  process.exitCode = 1;
});
