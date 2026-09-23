import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Bridge } from "../src/core/bridge.js";

describe("AgentBridge 核心闭环", () => {
  let bridge: Bridge;

  beforeEach(() => {
    bridge = new Bridge({ dbPath: ":memory:" });
  });

  afterEach(() => {
    bridge.close();
  });

  it("Agent 注册与发现", () => {
    bridge.agents.register({ agent_id: "codex", agent_name: "Codex" });
    bridge.agents.register({ agent_id: "qoder", agent_name: "Qoder CN" });

    const agents = bridge.agents.list();
    assert.equal(agents.length, 2);
    assert.deepEqual(
      agents.map((a) => a.agent_id).sort(),
      ["codex", "qoder"]
    );
  });

  it("完整 Codex → Qoder → Codex 任务闭环", () => {
    bridge.agents.register({ agent_id: "codex", agent_name: "Codex" });
    bridge.agents.register({ agent_id: "qoder", agent_name: "Qoder CN" });

    // Codex 创建任务
    const task = bridge.tasks.create({
      from: "codex",
      to: "qoder",
      message: "检查 STM32 工程中的 LVGL 初始化问题",
      expects_response: true,
    });
    assert.equal(task.status, "pending");

    // Qoder 获取发给自己的消息（含任务消息）
    const inbox = bridge.messages.getForAgent({ agent_id: "qoder" });
    const taskMsg = inbox.find((m) => m.task_id === task.task_id);
    assert.ok(taskMsg);
    assert.equal(taskMsg!.type, "task");

    // Qoder 将状态改为 running
    let updated = bridge.tasks.reply({ task_id: task.task_id, status: "running" });
    assert.equal(updated.status, "running");

    // Qoder 返回结果
    updated = bridge.tasks.reply({
      task_id: task.task_id,
      status: "completed",
      message: "发现 LVGL 初始化存在 xxx 问题",
    });
    assert.equal(updated.status, "completed");
    assert.ok(updated.result!.includes("LVGL"));

    // Codex 查询任务状态，获取结果
    const result = bridge.tasks.get(task.task_id)!;
    assert.equal(result.status, "completed");
    assert.ok(result.result!.includes("xxx"));

    // Codex 获取发给自己的回复消息
    const codexInbox = bridge.messages.getForAgent({ agent_id: "codex" });
    const reply = codexInbox.find((m) => m.task_id === task.task_id && m.to === "codex");
    assert.ok(reply);
    assert.equal(reply!.status, "completed");
  });

  it("状态机支持 pending/running/completed/failed/cancelled", () => {
    bridge.agents.register({ agent_id: "codex", agent_name: "Codex" });
    bridge.agents.register({ agent_id: "qoder", agent_name: "Qoder CN" });

    const task = bridge.tasks.create({ from: "codex", to: "qoder", message: "x" });

    for (const s of ["running", "failed", "cancelled", "completed"] as const) {
      const t = bridge.tasks.reply({ task_id: task.task_id, status: s });
      assert.equal(t.status, s);
    }
  });

  it("非法状态会被拒绝", () => {
    bridge.agents.register({ agent_id: "codex", agent_name: "Codex" });
    const task = bridge.tasks.create({ from: "codex", to: "qoder", message: "x" });
    assert.throws(() =>
      bridge.tasks.reply({ task_id: task.task_id, status: "invalid" as never })
    );
  });

  it("回复不存在的任务会报错", () => {
    assert.throws(
      () => bridge.tasks.reply({ task_id: "task-nonexistent", status: "completed" }),
      /not found/i
    );
  });

  it("普通消息发送与接收", () => {
    bridge.agents.register({ agent_id: "codex", agent_name: "Codex" });
    bridge.agents.register({ agent_id: "qoder", agent_name: "Qoder CN" });

    const msg = bridge.messages.send({
      from: "codex",
      to: "qoder",
      message: "你好，请检查 xxx",
    });
    assert.match(msg.message_id, /^msg-/);
    assert.match(msg.conversation_id!, /^conv-/);

    const inbox = bridge.messages.getForAgent({ agent_id: "qoder" });
    assert.ok(inbox.some((m) => m.message_id === msg.message_id));
  });
});
