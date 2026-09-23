/**
 * AgentBridge — MCP Tools
 *
 * 将 Core 层的 Bridge 包装成 MCP Tool，供 Codex / Qoder CN 调用。
 * 共 7 个 Tool：
 *   agent_register, agent_list, send_message, get_messages,
 *   create_task, get_task, reply_task
 */
import type { Bridge } from "../core/bridge.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

type ToolResult = CallToolResult;

function ok(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

function err(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export function createToolHandlers(bridge: Bridge) {
  return {
    /** 注册一个 Agent 身份 */
    async agent_register(params: { agent_id: string; agent_name: string }): Promise<ToolResult> {
      try {
        const agent = bridge.agents.register({
          agent_id: params.agent_id,
          agent_name: params.agent_name,
        });
        return ok(agent);
      } catch (e) {
        return err(e);
      }
    },

    /** 列出所有已注册 Agent */
    async agent_list(): Promise<ToolResult> {
      try {
        return ok(bridge.agents.list());
      } catch (e) {
        return err(e);
      }
    },

    /** 发送一条消息 */
    async send_message(params: {
      from: string;
      to: string;
      message: string;
      conversation_id?: string;
      reply_to?: string;
      metadata?: Record<string, unknown>;
    }): Promise<ToolResult> {
      try {
        const msg = bridge.messages.send({
          from: params.from,
          to: params.to,
          message: params.message,
          conversation_id: params.conversation_id,
          reply_to: params.reply_to,
          metadata: params.metadata,
        });
        return ok(msg);
      } catch (e) {
        return err(e);
      }
    },

    /** 获取发给指定 Agent 的消息 */
    async get_messages(params: {
      agent_id: string;
      limit?: number;
      unread_only?: boolean;
      conversation_id?: string;
    }): Promise<ToolResult> {
      try {
        const msgs = bridge.messages.getForAgent({
          agent_id: params.agent_id,
          limit: params.limit ?? 20,
          unread_only: params.unread_only,
          conversation_id: params.conversation_id,
        });
        return ok(msgs);
      } catch (e) {
        return err(e);
      }
    },

    /** 创建一个 Task */
    async create_task(params: {
      from: string;
      to: string;
      message: string;
      expects_response?: boolean;
      conversation_id?: string;
      reply_to?: string;
      metadata?: Record<string, unknown>;
    }): Promise<ToolResult> {
      try {
        const task = bridge.tasks.create({
          from: params.from,
          to: params.to,
          message: params.message,
          expects_response: params.expects_response,
          conversation_id: params.conversation_id,
          reply_to: params.reply_to,
          metadata: params.metadata,
        });
        return ok({ task_id: task.task_id, status: task.status, task });
      } catch (e) {
        return err(e);
      }
    },

    /** 查询 Task 状态 */
    async get_task(params: { task_id: string }): Promise<ToolResult> {
      try {
        const task = bridge.tasks.get(params.task_id);
        if (!task) {
          return err(new Error(`Task not found: ${params.task_id}`));
        }
        return ok(task);
      } catch (e) {
        return err(e);
      }
    },

    /** 回复 / 更新一个 Task */
    async reply_task(params: {
      task_id: string;
      status: string;
      message?: string;
      metadata?: Record<string, unknown>;
    }): Promise<ToolResult> {
      try {
        const task = bridge.tasks.reply({
          task_id: params.task_id,
          status: params.status as never,
          message: params.message,
          metadata: params.metadata,
        });
        return ok(task);
      } catch (e) {
        return err(e);
      }
    },
  };
}
