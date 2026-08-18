import { config } from "../config.js";
import { AdkAgentStrategy } from "./adk-strategy.js";
import { MockAgentStrategy } from "./mock-strategy.js";
import type { AgentStrategy } from "./strategy.js";
export const createAgentStrategy = (): AgentStrategy =>
  config.AGENT_STRATEGY === "adk"
    ? new AdkAgentStrategy(config.GEMINI_MODEL)
    : new MockAgentStrategy();
