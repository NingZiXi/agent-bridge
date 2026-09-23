/**
 * AgentBridge — ID 生成工具
 *
 * 统一生成 message_id / task_id / conversation_id。
 * 保证唯一性、可读性，并带有时间戳前缀方便排查。
 */
import { randomBytes } from "node:crypto";

function nowCompact(): string {
  // 例如 20260923T235500
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "T");
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

/** 生成 message_id，形如 msg-20260923T235500-4f2a */
export function genMessageId(): string {
  return `msg-${nowCompact()}-${randomHex(3)}`;
}

/** 生成 task_id，形如 task-20260923T235500-4f2a */
export function genTaskId(): string {
  return `task-${nowCompact()}-${randomHex(3)}`;
}

/** 生成 conversation_id，形如 conv-20260923T235500-4f2a */
export function genConversationId(): string {
  return `conv-${nowCompact()}-${randomHex(3)}`;
}

/** 生成 ISO 8601 UTC 时间戳 */
export function nowISO(): string {
  return new Date().toISOString();
}
