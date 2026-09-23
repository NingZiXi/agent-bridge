/**
 * AgentBridge — Task Manager
 *
 * 负责 Task 的创建、状态机流转与回复。
 * 状态机：pending → running → completed | failed | cancelled
 *
 * 同时将 Task 的关键事件（创建、回复）写入消息表，
 * 使 Task 与 Message 在时间线上保持关联。
 */
import type { Storage } from "./storage.js";
import type { MessageManager } from "./message_manager.js";
import { genConversationId, genTaskId, nowISO } from "./ids.js";
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  ReplyTaskInput,
} from "../models/types.js";

/** 合法的 Task 状态集合 */
const VALID_STATUSES: ReadonlySet<TaskStatus> = new Set([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export class TaskManager {
  constructor(
    private storage: Storage,
    private messages: MessageManager
  ) {}

  /** 创建任务 */
  create(input: CreateTaskInput): Task {
    const now = nowISO();
    const task: Task = {
      task_id: genTaskId(),
      from: input.from,
      to: input.to,
      message: input.message,
      status: "pending",
      expects_response: input.expects_response ?? true,
      result: null,
      conversation_id: input.conversation_id ?? genConversationId(),
      reply_to: input.reply_to ?? null,
      metadata: input.metadata ?? null,
      created_at: now,
      updated_at: now,
    };
    this.storage.insertTask(task);

    // 记录一条任务消息，方便接收方通过 get_messages 感知到新任务
    this.messages.recordTaskMessage({
      task_id: task.task_id,
      from: task.from,
      to: task.to,
      type: "task",
      message: task.message,
      status: task.status,
      conversation_id: task.conversation_id,
    });

    return task;
  }

  /** 获取任务 */
  get(taskId: string): Task | undefined {
    return this.storage.getTask(taskId);
  }

  /** 回复 / 更新任务状态 */
  reply(input: ReplyTaskInput): Task {
    const task = this.storage.getTask(input.task_id);
    if (!task) {
      throw new Error(`Task not found: ${input.task_id}`);
    }
    if (!VALID_STATUSES.has(input.status)) {
      throw new Error(
        `Invalid task status: ${input.status}. Expected one of ${[...VALID_STATUSES].join(", ")}`
      );
    }

    const now = nowISO();
    const result = input.message ?? null;
    this.storage.updateTaskStatus(task.task_id, input.status, result, now);

    // 记录一条回复消息（发给任务发起方）
    this.messages.recordTaskMessage({
      task_id: task.task_id,
      from: task.to,
      to: task.from,
      type: "task",
      message: result ?? `Task status updated to ${input.status}`,
      status: input.status,
      conversation_id: task.conversation_id,
    });

    const updated = this.storage.getTask(task.task_id)!;
    return updated;
  }

  /** 列出发给指定 Agent 的任务 */
  listForAgent(agentId: string, limit: number): Task[] {
    return this.storage.listTasksFor(agentId, limit);
  }
}
