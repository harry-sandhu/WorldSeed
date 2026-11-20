import { DeterministicRandom } from "./prng.js";
import type { Agent, Checkpoint, ResourceType, SimulationConfig, SimulationEvent, SimulationState } from "./types.js";

const RESOURCES: readonly ResourceType[] = ["food", "water", "energy"];

function copyAgent(agent: Agent): Agent {
  return { ...agent, position: { ...agent.position }, inventory: { ...agent.inventory } };
}

function copyState(state: SimulationState): SimulationState {
  return { ...state, resources: { ...state.resources }, agents: state.agents.map(copyAgent) };
}

export class SimulationEngine {
  private random: DeterministicRandom;
  private readonly config: SimulationConfig;
  private state: SimulationState;
  private nextAgentNumber: number;

  public constructor(config: SimulationConfig, state?: SimulationState) {
    this.config = config;
    this.state = state ? copyState(state) : SimulationEngine.createInitialState(config);
    this.random = new DeterministicRandom(this.state.randomState);
    this.nextAgentNumber = this.state.agents.length;
  }

  public static createInitialState(config: SimulationConfig): SimulationState {
    const random = new DeterministicRandom(config.seed);
    const agents: Agent[] = [];
    for (let index = 0; index < config.world.initialAgents; index += 1) {
      agents.push({
        id: `agent-${index}`,
        species: "origin",
        position: { x: random.integer(config.world.width), y: random.integer(config.world.height) },
        energy: 60,
        health: 100,
        age: 0,
        inventory: { food: 0, water: 0, energy: 0 },
        alive: true
      });
    }
    return { tick: 0, seed: config.seed, randomState: random.getState(), resources: { ...config.world.initialResources }, agents };
  }

  public getState(): SimulationState { return copyState({ ...this.state, randomState: this.random.getState() }); }

  public checkpoint(): Checkpoint { return { tick: this.state.tick, state: this.getState() }; }

  public restore(checkpoint: Checkpoint): void {
    this.state = copyState(checkpoint.state);
    this.random = new DeterministicRandom(this.state.randomState);
    this.nextAgentNumber = this.state.agents.length;
  }

  public step(): readonly SimulationEvent[] {
    const events: SimulationEvent[] = [];
    const { world } = this.config;
    const living = this.state.agents.filter((agent) => agent.alive);

    for (const agent of living) {
      agent.age += 1;
      agent.position = {
        x: Math.max(0, Math.min(world.width - 1, agent.position.x + this.random.integer(3) - 1)),
        y: Math.max(0, Math.min(world.height - 1, agent.position.y + this.random.integer(3) - 1))
      };

      const food = Math.min(1, this.state.resources.food);
      const water = Math.min(1, this.state.resources.water);
      this.state.resources.food -= food;
      this.state.resources.water -= water;
      agent.inventory.food += food;
      agent.inventory.water += water;
      agent.energy += food * 8 + water * 3 - 1;
      agent.health = Math.min(100, agent.health + (food > 0 && water > 0 ? 1 : -8));

      if (agent.health <= 0 || agent.energy <= 0) {
        agent.alive = false;
        events.push({ type: "agent.died", tick: this.state.tick + 1, agentId: agent.id, cause: "starvation" });
      } else if (agent.age > world.maxAge) {
        agent.alive = false;
        events.push({ type: "agent.died", tick: this.state.tick + 1, agentId: agent.id, cause: "age" });
      }
    }

    for (const resource of RESOURCES) {
      this.state.resources[resource] = Math.min(world.initialResources[resource], this.state.resources[resource] + world.regeneration[resource]);
    }

    const parents = this.state.agents.filter((agent) => agent.alive && agent.age >= world.reproductionAge && agent.energy >= world.reproductionEnergy);
    for (const parent of parents) {
      if (this.random.next() < 0.08) {
        parent.energy -= world.reproductionEnergy / 2;
        const child: Agent = { ...copyAgent(parent), id: `agent-${this.nextAgentNumber++}`, age: 0, energy: 35, inventory: { food: 0, water: 0, energy: 0 } };
        this.state.agents.push(child);
        events.push({ type: "agent.born", tick: this.state.tick + 1, agentId: child.id });
      }
    }

    this.state.tick += 1;
    this.state.randomState = this.random.getState();
    events.push({ type: "tick.completed", tick: this.state.tick, population: this.state.agents.filter((agent) => agent.alive).length });
    return events;
  }

  public run(ticks: number): readonly SimulationEvent[] {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error("ticks must be a non-negative integer");
    return Array.from({ length: ticks }, () => this.step()).flat();
  }
}
