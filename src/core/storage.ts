/**
 * AgentBridge — SQLite 存储层
 *
 * 第一阶段采用「单进程 + SQLite」，不引入 PostgreSQL / Redis / NATS。
 * 保证：
 *   - Agent 重启后数据不丢失
 *   - 消息不因进程退出而丢失
 *   - Task 状态可恢复
 *   - message_id / task_id 唯一性
 *
 * 本层是纯数据访问层，不包含业务逻辑，也不与任何具体 Agent 绑定。
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  Agent,
  Message,
  Task,
  TaskStatus,
} from "../models/types.js";

export interface StorageOptions {
  /** SQLite 文件路径，默认 data/agent-bridge.db */
  dbPath?: string;
}

export class Storage {
  private db: Database.Database;

  constructor(options: StorageOptions = {}) {
    const dbPath = options.dbPath ?? "data/agent-bridge.db";
    if (dbPath !== ":memory:") {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  /** 建表迁移（幂等） */
  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        agent_id    TEXT PRIMARY KEY,
        agent_name  TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'online',
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        message_id      TEXT PRIMARY KEY,
        task_id         TEXT,
        "from"          TEXT NOT NULL,
        "to"            TEXT NOT NULL,
        type            TEXT NOT NULL DEFAULT 'message',
        message         TEXT NOT NULL,
        status          TEXT,
        conversation_id TEXT,
        reply_to        TEXT,
        metadata        TEXT,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_to ON messages ("to");
      CREATE INDEX IF NOT EXISTS idx_messages_from ON messages ("from");

      CREATE TABLE IF NOT EXISTS tasks (
        task_id          TEXT PRIMARY KEY,
        "from"           TEXT NOT NULL,
        "to"             TEXT NOT NULL,
        message          TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        expects_response INTEGER NOT NULL DEFAULT 1,
        result           TEXT,
        conversation_id  TEXT,
        reply_to         TEXT,
        metadata         TEXT,
        created_at       TEXT NOT NULL,
        updated_at       TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_to ON tasks ("to");
      CREATE INDEX IF NOT EXISTS idx_tasks_from ON tasks ("from");
    `);
  }

  // ───────────────────────── Agent ─────────────────────────

  upsertAgent(agent: Agent): void {
    this.db
      .prepare(
        `INSERT INTO agents (agent_id, agent_name, status, created_at, updated_at)
         VALUES (@agent_id, @agent_name, @status, @created_at, @updated_at)
         ON CONFLICT(agent_id) DO UPDATE SET
           agent_name = excluded.agent_name,
           status     = excluded.status,
           updated_at = excluded.updated_at`
      )
      .run(agent);
  }

  getAgent(agentId: string): Agent | undefined {
    const row = this.db
      .prepare(`SELECT * FROM agents WHERE agent_id = ?`)
      .get(agentId) as Agent | undefined;
    return row;
  }

  listAgents(): Agent[] {
    return this.db
      .prepare(`SELECT * FROM agents ORDER BY created_at ASC`)
      .all() as Agent[];
  }

  // ───────────────────────── Message ─────────────────────────

  insertMessage(msg: Message): void {
    this.db
      .prepare(
        `INSERT INTO messages
           (message_id, task_id, "from", "to", type, message, status,
            conversation_id, reply_to, metadata, created_at, updated_at)
         VALUES
           (@message_id, @task_id, @from, @to, @type, @message, @status,
            @conversation_id, @reply_to, @metadata, @created_at, @updated_at)`
      )
      .run(this.serializeMessage(msg));
  }

  getMessage(messageId: string): Message | undefined {
    const row = this.db
      .prepare(`SELECT * FROM messages WHERE message_id = ?`)
      .get(messageId) as Message | undefined;
    return row ? this.deserializeMessage(row) : undefined;
  }

  listMessagesFor(agentId: string, limit: number): Message[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM messages WHERE "to" = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(agentId, limit) as Message[];
    return rows.map((r) => this.deserializeMessage(r)).reverse();
  }

  // ───────────────────────── Task ─────────────────────────

  insertTask(task: Task): void {
    this.db
      .prepare(
        `INSERT INTO tasks
           (task_id, "from", "to", message, status, expects_response,
            result, conversation_id, reply_to, metadata, created_at, updated_at)
         VALUES
           (@task_id, @from, @to, @message, @status, @expects_response,
            @result, @conversation_id, @reply_to, @metadata, @created_at, @updated_at)`
      )
      .run(this.serializeTask(task));
  }

  getTask(taskId: string): Task | undefined {
    const row = this.db
      .prepare(`SELECT * FROM tasks WHERE task_id = ?`)
      .get(taskId) as Task | undefined;
    return row ? this.deserializeTask(row) : undefined;
  }

  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result: string | null,
    updatedAt: string
  ): void {
    this.db
      .prepare(
        `UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE task_id = ?`
      )
      .run(status, result, updatedAt, taskId);
  }

  listTasksFor(agentId: string, limit: number): Task[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM tasks WHERE "to" = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(agentId, limit) as Task[];
    return rows.map((r) => this.deserializeTask(r)).reverse();
  }

  // ───────────────────────── 序列化辅助 ─────────────────────────

  private serializeMessage(msg: Message): Record<string, unknown> {
    const { metadata, ...rest } = msg;
    return {
      ...rest,
      metadata: metadata ? JSON.stringify(metadata) : null,
    };
  }

  private deserializeMessage(row: unknown): Message {
    const r = row as Record<string, unknown>;
    return {
      ...(r as unknown as Message),
      metadata: r.metadata ? JSON.parse(r.metadata as string) : null,
    };
  }

  private serializeTask(task: Task): Record<string, unknown> {
    const { metadata, expects_response, ...rest } = task;
    return {
      ...rest,
      expects_response: expects_response ? 1 : 0,
      metadata: metadata ? JSON.stringify(metadata) : null,
    };
  }

  private deserializeTask(row: unknown): Task {
    const r = row as Record<string, unknown>;
    return {
      ...(r as unknown as Task),
      expects_response: r.expects_response === 1 || r.expects_response === true,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : null,
    };
  }

  close(): void {
    this.db.close();
  }
}
