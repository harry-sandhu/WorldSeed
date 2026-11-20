export type AgentId = string;
export type ResourceType = "food" | "water" | "energy";

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface Agent {
  readonly id: AgentId;
  readonly species: string;
  position: Position;
  energy: number;
  health: number;
  age: number;
  inventory: Record<ResourceType, number>;
  alive: boolean;
}

export interface WorldConfig {
  readonly width: number;
  readonly height: number;
  readonly initialResources: Record<ResourceType, number>;
  readonly regeneration: Record<ResourceType, number>;
  readonly initialAgents: number;
  readonly reproductionAge: number;
  readonly reproductionEnergy: number;
  readonly maxAge: number;
}

export interface SimulationConfig {
  readonly seed: number;
  readonly tickRate: number;
  readonly world: WorldConfig;
}

export interface SimulationState {
  tick: number;
  readonly seed: number;
  randomState: number;
  readonly resources: Record<ResourceType, number>;
  readonly agents: Agent[];
}

export type SimulationEvent =
  | { readonly type: "tick.completed"; readonly tick: number; readonly population: number }
  | { readonly type: "agent.born"; readonly tick: number; readonly agentId: AgentId }
  | { readonly type: "agent.died"; readonly tick: number; readonly agentId: AgentId; readonly cause: "age" | "starvation" };

export interface Checkpoint {
  readonly tick: number;
  readonly state: SimulationState;
}
