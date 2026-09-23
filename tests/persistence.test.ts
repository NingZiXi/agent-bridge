import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Bridge } from "../src/core/bridge.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("持久化与重启恢复", () => {
  let dirs: string[] = [];

  function tmpDb(): string {
    const dir = mkdtempSync(join(tmpdir(), "agent-bridge-"));
    dirs.push(dir);
    return join(dir, "test.db");
  }

  afterEach(() => {
    for (const d of dirs) {
      rmSync(d, { recursive: true, force: true });
    }
    dirs = [];
  });

  it("重启后 Task 和消息仍然存在", () => {
    const dbPath = tmpDb();

    // 第一次启动：注册 + 创建任务 + 回复
    const b1 = new Bridge({ dbPath });
    b1.agents.register({ agent_id: "codex", agent_name: "Codex" });
    b1.agents.register({ agent_id: "qoder", agent_name: "Qoder CN" });
    const task = b1.tasks.create({
      from: "codex",
      to: "qoder",
      message: "检查 LVGL 初始化",
    });
    b1.tasks.reply({
      task_id: task.task_id,
      status: "completed",
      message: "发现 xxx 问题",
    });
    b1.close();

    // 第二次启动（模拟重启）：查询任务仍存在
    const b2 = new Bridge({ dbPath });
    const recovered = b2.tasks.get(task.task_id);
    assert.ok(recovered);
    assert.equal(recovered!.status, "completed");
    assert.ok(recovered!.result!.includes("xxx"));

    const agents = b2.agents.list();
    assert.deepEqual(agents.map((a) => a.agent_id).sort(), ["codex", "qoder"]);

    const inbox = b2.messages.getForAgent({ agent_id: "qoder" });
    assert.ok(inbox.length > 0);
    b2.close();
  });

  it("message_id 与 task_id 唯一", () => {
    const dbPath = tmpDb();
    const b = new Bridge({ dbPath });
    b.agents.register({ agent_id: "codex", agent_name: "Codex" });
    b.agents.register({ agent_id: "qoder", agent_name: "Qoder CN" });

    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const t = b.tasks.create({ from: "codex", to: "qoder", message: `task ${i}` });
      ids.add(t.task_id);
    }
    assert.equal(ids.size, 100);
    b.close();
  });
});
