/**
 * AgentBridge — Agent Manager
 *
 * 负责 Agent 的注册、状态维护与发现。
 * 完全 Agent 无关：不包含任何 Codex / Qoder 特有逻辑。
 */
import type { Storage } from "./storage.js";
import { nowISO } from "./ids.js";
import type { Agent, AgentRegisterInput } from "../models/types.js";

export class AgentManager {
  constructor(private storage: Storage) {}

  /** 注册或刷新一个 Agent（幂等，重复注册会更新状态为 online） */
  register(input: AgentRegisterInput): Agent {
    const now = nowISO();
    const existing = this.storage.getAgent(input.agent_id);
    const agent: Agent = {
      agent_id: input.agent_id,
      agent_name: input.agent_name,
      status: "online",
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    this.storage.upsertAgent(agent);
    return agent;
  }

  /** 列出所有已注册 Agent */
  list(): Agent[] {
    return this.storage.listAgents();
  }

  /** 查询单个 Agent */
  get(agentId: string): Agent | undefined {
    return this.storage.getAgent(agentId);
  }

  /** 判断 Agent 是否已注册 */
  exists(agentId: string): boolean {
    return this.storage.getAgent(agentId) !== undefined;
  }
}
