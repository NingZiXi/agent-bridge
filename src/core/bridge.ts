/**
 * AgentBridge — 核心门面（Bridge）
 *
 * 组合 AgentManager / MessageManager / TaskManager，对外暴露统一接口。
 *
 * 关键设计：Core 层只负责 Agent / Message / Task / Storage / Routing，
 * 不感知任何具体 Agent。MCP、HTTP、WebSocket 等接口都通过本类接入，
 * 未来增加新接口或新 Agent 时无需改动 Core。
 */
import { Storage } from "./storage.js";
import { AgentManager } from "./agent_manager.js";
import { MessageManager } from "./message_manager.js";
import { TaskManager } from "./task_manager.js";
import type { StorageOptions } from "./storage.js";

export class Bridge {
  readonly storage: Storage;
  readonly agents: AgentManager;
  readonly messages: MessageManager;
  readonly tasks: TaskManager;

  constructor(options: StorageOptions = {}) {
    this.storage = new Storage(options);
    this.agents = new AgentManager(this.storage);
    this.messages = new MessageManager(this.storage);
    this.tasks = new TaskManager(this.storage, this.messages);
  }

  close(): void {
    this.storage.close();
  }
}
