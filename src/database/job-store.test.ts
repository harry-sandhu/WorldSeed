import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseJobStore } from "./job-store.js";
import type { SimulationJob } from "../simulation-worker/index.js";
import type { Agent, SimulationConfig } from "../simulation-core/index.js";

interface RecordedCall { readonly method: string; readonly args: readonly unknown[]; }

/**
 * A minimal thenable chain mock: every non-"then" property access records
 * the call and returns a fresh chain link, so arbitrarily long postgrest-js
 * chains (`.from().select().eq().order().limit().maybeSingle()`) work
 * without modeling the real query builder. `await`ing a chain link resolves
 * to the next queued response, in the order job-store actually issues them.
 */
function createMockClient(responses: readonly unknown[]): { client: SupabaseClient; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  let next = 0;
  function chain(): unknown {
    return new Proxy(() => {}, {
      get(_target, prop: string) {
        if (prop === "then") {
          const value = responses[next++];
          return (resolve: (v: unknown) => void) => resolve(value);
        }
        return (...args: unknown[]) => { calls.push({ method: prop, args }); return chain(); };
      }
    });
  }
  const client = {
    from: (...args: unknown[]) => { calls.push({ method: "from", args }); return chain(); },
    rpc: (...args: unknown[]) => { calls.push({ method: "rpc", args }); return chain(); }
  };
  return { client: client as unknown as SupabaseClient, calls };
}

const config: SimulationConfig = {
  seed: 7, tickRate: 10,
  world: { width: 10, height: 10, initialResources: { food: 100, water: 100, energy: 0 }, regeneration: { food: 1, water: 1, energy: 0 }, initialAgents: 2, reproductionAge: 4, reproductionEnergy: 70, maxAge: 100 }
};

function agent(overrides: Partial<Agent>): Agent {
  return { id: "a", species: "origin", position: { x: 0, y: 0 }, energy: 10, health: 10, age: 0, inventory: { food: 0, water: 0, energy: 0 }, alive: true, ...overrides };
}

function job(overrides: Partial<SimulationJob> = {}): SimulationJob {
  return { id: "job-1", universeId: "universe-1", config, totalTicks: 5, checkpointEvery: 2, maxAttempts: 2, status: "running", attempt: 0, completedTicks: 2, leaseUntil: null, workerId: "worker-a", cancelRequested: false, error: null, checkpoint: null, ...overrides };
}

describe("SupabaseJobStore.claim", () => {
  it("passes the given runId through to the claim_simulation_run RPC", async () => {
    const row = { id: "job-1", universe_id: "universe-1", status: "running", config, seed: 7, total_ticks: 5, completed_ticks: 0, checkpoint_every: 2, max_attempts: 2, attempt: 1, lease_until: null, worker_id: "worker-a", cancel_requested: false, error_message: null };
    const { client, calls } = createMockClient([
      { data: row, error: null }, // rpc(...).single()
      { data: null, error: null } // latestCheckpoint()
    ]);
    const store = new SupabaseJobStore(client);

    const result = await store.claim("worker-a", 5000, "job-1");

    const rpcCall = calls.find((call) => call.method === "rpc");
    expect(rpcCall?.args[0]).toBe("claim_simulation_run");
    expect(rpcCall?.args[1]).toMatchObject({ p_worker_id: "worker-a", p_run_id: "job-1" });
    expect(result?.id).toBe("job-1");
    expect(result?.checkpoint).toBeNull();
  });

  it("returns null without a further checkpoint lookup when no row is claimable", async () => {
    const { client, calls } = createMockClient([{ data: null, error: { code: "PGRST116", message: "no rows" } }]);
    const store = new SupabaseJobStore(client);

    const result = await store.claim("worker-a", 5000);

    expect(result).toBeNull();
    expect(calls.filter((call) => call.method === "select" && call.args[0] === "tick,state")).toHaveLength(0);
  });
});

describe("SupabaseJobStore.save", () => {
  it("upserts a checkpoint and a run summary counting only living agents", async () => {
    const checkpoint = {
      tick: 10,
      state: {
        tick: 10, seed: 7, randomState: 1,
        resources: { food: 42, water: 17, energy: 99 },
        agents: [agent({ alive: true }), agent({ alive: true }), agent({ alive: false })]
      }
    };
    const { client, calls } = createMockClient([
      { error: null }, // simulation_runs update
      { error: null }, // simulation_checkpoints upsert
      { error: null }  // simulation_run_summaries upsert
    ]);
    const store = new SupabaseJobStore(client);

    await store.save(job({ status: "running", checkpoint }));

    const fromCalls = calls.filter((call) => call.method === "from").map((call) => call.args[0]);
    expect(fromCalls).toEqual(["simulation_runs", "simulation_checkpoints", "simulation_run_summaries"]);

    const [checkpointUpsert, summaryUpsert] = calls.filter((call) => call.method === "upsert");
    expect(checkpointUpsert?.args[0]).toMatchObject({ run_id: "job-1", tick: 10, population: 2 });
    expect(summaryUpsert?.args[0]).toMatchObject({ run_id: "job-1", tick: 10, population: 2, food: 42, water: 17, energy: 99 });
  });

  it("skips checkpoint and summary writes when the job has no checkpoint yet", async () => {
    const { client, calls } = createMockClient([{ error: null }]);
    const store = new SupabaseJobStore(client);

    await store.save(job({ checkpoint: null }));

    expect(calls.filter((call) => call.method === "upsert")).toHaveLength(0);
  });
});

describe("SupabaseJobStore.requestCancellation", () => {
  it("returns true when a queued or running row was actually updated", async () => {
    const { client } = createMockClient([{ data: [{ id: "job-1" }], error: null }]);
    expect(await new SupabaseJobStore(client).requestCancellation("job-1")).toBe(true);
  });

  it("returns false when no matching row was updated", async () => {
    const { client } = createMockClient([{ data: [], error: null }]);
    expect(await new SupabaseJobStore(client).requestCancellation("job-1")).toBe(false);
  });
});
