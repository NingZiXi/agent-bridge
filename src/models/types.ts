/**
 * AgentBridge — 核心数据模型定义
 *
 * 这里定义的是「Agent 无关」的领域模型，与 Codex / Qoder 等具体 Agent 解耦。
 * 未来接入 Claude Code、Gemini、OpenCode 等 Agent 时无需修改本文件。
 */

/** Agent 在线状态 */
export type AgentStatus = "online" | "offline";

/** Task 状态机：pending → running → completed | failed | cancelled */
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/** 消息类型：普通聊天消息或任务消息 */
export type MessageType = "message" | "task";

/** Agent 实体 */
export interface Agent {
  agent_id: string;
  agent_name: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

/** Agent 注册参数 */
export interface AgentRegisterInput {
  agent_id: string;
  agent_name: string;
}

/** 消息实体 */
export interface Message {
  message_id: string;
  task_id: string | null;
  from: string;
  to: string;
  type: MessageType;
  message: string;
  status: string | null;
  // 预留字段：多轮对话、回复链、扩展元数据
  conversation_id: string | null;
  reply_to: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** 发送消息参数 */
export interface SendMessageInput {
  from: string;
  to: string;
  message: string;
  conversation_id?: string;
  reply_to?: string;
  metadata?: Record<string, unknown>;
}

/** Task 实体 */
export interface Task {
  task_id: string;
  from: string;
  to: string;
  message: string;
  status: TaskStatus;
  expects_response: boolean;
  result: string | null;
  conversation_id: string | null;
  reply_to: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** 创建 Task 参数 */
export interface CreateTaskInput {
  from: string;
  to: string;
  message: string;
  expects_response?: boolean;
  conversation_id?: string;
  reply_to?: string;
  metadata?: Record<string, unknown>;
}

/** 回复 Task 参数 */
export interface ReplyTaskInput {
  task_id: string;
  status: TaskStatus;
  message?: string;
  metadata?: Record<string, unknown>;
}

/** 消息查询过滤器 */
export interface GetMessagesInput {
  agent_id: string;
  limit?: number;
  unread_only?: boolean;
  conversation_id?: string;
}
