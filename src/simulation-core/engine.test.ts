import { describe, expect, it } from "vitest";
import { SimulationEngine } from "./engine.js";
import type { SimulationConfig } from "./types.js";

const config: SimulationConfig = {
  seed: 42,
  tickRate: 10,
  world: {
    width: 20, height: 20, initialResources: { food: 100, water: 100, energy: 30 },
    regeneration: { food: 2, water: 2, energy: 0 }, initialAgents: 8, reproductionAge: 3, reproductionEnergy: 70, maxAge: 100
  }
};

describe("SimulationEngine", () => {
  it("produces identical state for identical configuration and seed", () => {
    const first = new SimulationEngine(config);
    const second = new SimulationEngine(config);
    first.run(25);
    second.run(25);
    expect(first.getState()).toEqual(second.getState());
  });

  it("restores a checkpoint and replays the same future", () => {
    const engine = new SimulationEngine(config);
    engine.run(5);
    const checkpoint = engine.checkpoint();
    engine.run(10);
    const expected = engine.getState();
    engine.restore(checkpoint);
    engine.run(10);
    expect(engine.getState()).toEqual(expected);
  });

  it("accounts for resource consumption and emits lifecycle events", () => {
    const engine = new SimulationEngine({ ...config, world: { ...config.world, initialAgents: 2, initialResources: { food: 1, water: 1, energy: 0 }, regeneration: { food: 0, water: 0, energy: 0 } } });
    const events = engine.run(2);
    expect(engine.getState().resources.food).toBe(0);
    expect(events.some((event) => event.type === "tick.completed")).toBe(true);
  });
});
