/**
 * AgentBridge — MCP 端到端冒烟测试
 *
 * 通过 MCP Client（内存传输）连接我们自己的 MCP Server，
 * 模拟 Codex / Qoder 两个 Agent 通过 MCP 工具完成完整闭环。
 *
 * 运行：node --test --import tsx tests/mcp_e2e.test.ts
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Bridge } from "../src/core/bridge.js";
import { createMcpServer } from "../src/mcp/server.js";

let bridge: Bridge;
let client: Client;

before(async () => {
  bridge = new (await import("../src/core/bridge.js")).Bridge({
    dbPath: ":memory:",
  });
  const server = createMcpServer(bridge);

  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
});

after(() => {
  client?.close();
  bridge?.close();
});

test("完整 Codex → Qoder → Codex 闭环（通过 MCP 工具）", async () => {
  // 1. 注册 Codex
  const regCodex = await client.callTool({
    name: "agent_register",
    arguments: { agent_id: "codex", agent_name: "Codex" },
  });
  assert.equal(regCodex.isError, undefined);

  // 2. 注册 Qoder
  await client.callTool({
    name: "agent_register",
    arguments: { agent_id: "qoder", agent_name: "Qoder CN" },
  });

  // 3. agent_list 应返回两个 Agent
  const list = await client.callTool({ name: "agent_list", arguments: {} });
  const listText = (list.content as Array<{ text: string }>)[0].text;
  const agents = JSON.parse(listText);
  assert.equal(agents.length, 2);

  // 4. Codex 创建任务
  const created = await client.callTool({
    name: "create_task",
    arguments: {
      from: "codex",
      to: "qoder",
      message: "检查 STM32 工程中的 LVGL 初始化问题",
      expects_response: true,
    },
  });
  const createdText = (created.content as Array<{ text: string }>)[0].text;
  const createdJson = JSON.parse(createdText);
  assert.equal(createdJson.status, "pending");
  const taskId = createdJson.task_id;

  // 5. Qoder 获取消息（应看到任务消息）
  const inbox = await client.callTool({
    name: "get_messages",
    arguments: { agent_id: "qoder" },
  });
  const inboxText = (inbox.content as Array<{ text: string }>)[0].text;
  const inboxJson = JSON.parse(inboxText);
  assert.ok(inboxJson.some((m: { task_id: string }) => m.task_id === taskId));

  // 6. Qoder 改为 running
  const running = await client.callTool({
    name: "reply_task",
    arguments: { task_id: taskId, status: "running" },
  });
  const runningJson = JSON.parse((running.content as Array<{ text: string }>)[0].text);
  assert.equal(runningJson.status, "running");

  // 7. Qoder 返回结果
  const completed = await client.callTool({
    name: "reply_task",
    arguments: {
      task_id: taskId,
      status: "completed",
      message: "发现 LVGL 初始化存在 xxx 问题",
    },
  });
  const completedJson = JSON.parse((completed.content as Array<{ text: string }>)[0].text);
  assert.equal(completedJson.status, "completed");
  assert.ok(completedJson.result.includes("LVGL"));

  // 8. Codex 查询任务状态
  const status = await client.callTool({
    name: "get_task",
    arguments: { task_id: taskId },
  });
  const statusJson = JSON.parse((status.content as Array<{ text: string }>)[0].text);
  assert.equal(statusJson.status, "completed");
  assert.ok(statusJson.result.includes("xxx"));

  // 9. Codex 获取发给自己的回复消息
  const codexInbox = await client.callTool({
    name: "get_messages",
    arguments: { agent_id: "codex" },
  });
  const codexInboxJson = JSON.parse((codexInbox.content as Array<{ text: string }>)[0].text);
  assert.ok(
    codexInboxJson.some(
      (m: { task_id: string; status: string }) =>
        m.task_id === taskId && m.status === "completed"
    )
  );
});
