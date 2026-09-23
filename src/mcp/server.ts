/**
 * AgentBridge — MCP Server
 *
 * 基于 @modelcontextprotocol/sdk 的 stdio 传输。
 * 服务名：Agent Bridge MCP
 *
 * Codex 与 Qoder CN 都通过 stdio 启动本进程，本文件是 MCP 入口。
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { Bridge } from "../core/bridge.js";
import { createToolHandlers } from "./tools.js";

export const SERVER_NAME = "Agent Bridge MCP";
export const SERVER_VERSION = "0.1.0";

/** 构建并返回 MCP Server 实例（工具已注册） */
export function createMcpServer(bridge: Bridge): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    { capabilities: { tools: {} } }
  );

  const handlers = createToolHandlers(bridge);

  server.registerTool(
    "agent_register",
    {
      title: "Register an agent identity",
      description:
        "Register (or refresh) an agent identity so it becomes discoverable by other agents. Repeated registration updates status to online.",
      inputSchema: {
        agent_id: z.string().describe("Unique agent identifier, e.g. 'codex' or 'qoder'"),
        agent_name: z.string().describe("Human-readable agent name, e.g. 'Codex'"),
      },
    },
    (params) => handlers.agent_register(params)
  );

  server.registerTool(
    "agent_list",
    {
      title: "List registered agents",
      description: "List all currently registered agents and their status.",
      inputSchema: {},
    },
    () => handlers.agent_list()
  );

  server.registerTool(
    "send_message",
    {
      title: "Send a message to another agent",
      description: "Send a message from one agent to another.",
      inputSchema: {
        from: z.string().describe("Sender agent_id"),
        to: z.string().describe("Recipient agent_id"),
        message: z.string().describe("Message content"),
        conversation_id: z.string().optional().describe("Optional conversation id for multi-turn dialogue"),
        reply_to: z.string().optional().describe("Optional message_id this message replies to"),
        metadata: z.record(z.unknown()).optional().describe("Optional extension metadata"),
      },
    },
    (params) => handlers.send_message(params)
  );

  server.registerTool(
    "get_messages",
    {
      title: "Get messages for an agent",
      description: "Get messages addressed to a specific agent (most recent first).",
      inputSchema: {
        agent_id: z.string().describe("The agent whose inbox to read"),
        limit: z.number().int().positive().max(200).optional().describe("Max messages to return (default 20)"),
        unread_only: z.boolean().optional().describe("Reserved for future read-state tracking"),
        conversation_id: z.string().optional().describe("Optional conversation filter"),
      },
    },
    (params) => handlers.get_messages(params)
  );

  server.registerTool(
    "create_task",
    {
      title: "Create a task for another agent",
      description:
        "Create a task assigned to another agent. Returns task_id and initial status (pending).",
      inputSchema: {
        from: z.string().describe("Sender agent_id"),
        to: z.string().describe("Assignee agent_id"),
        message: z.string().describe("Task description"),
        expects_response: z.boolean().optional().describe("Whether a response is expected (default true)"),
        conversation_id: z.string().optional().describe("Optional conversation id"),
        reply_to: z.string().optional().describe("Optional task_id this task replies to"),
        metadata: z.record(z.unknown()).optional().describe("Optional extension metadata"),
      },
    },
    (params) => handlers.create_task(params)
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task status",
      description: "Query a task's status and result by task_id.",
      inputSchema: {
        task_id: z.string().describe("The task id to query"),
      },
    },
    (params) => handlers.get_task(params)
  );

  server.registerTool(
    "reply_task",
    {
      title: "Reply to / update a task",
      description:
        "Update a task's status (pending | running | completed | failed | cancelled) and optionally attach a result message.",
      inputSchema: {
        task_id: z.string().describe("The task id to reply to"),
        status: z
          .enum(["pending", "running", "completed", "failed", "cancelled"])
          .describe("New task status"),
        message: z.string().optional().describe("Result / reply message"),
        metadata: z.record(z.unknown()).optional().describe("Optional extension metadata"),
      },
    },
    (params) => handlers.reply_task(params)
  );

  return server;
}

/** 启动 MCP Server（stdio） */
export async function serveMCP(bridge: Bridge): Promise<void> {
  const server = createMcpServer(bridge);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
