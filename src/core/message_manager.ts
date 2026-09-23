/**
 * AgentBridge — Message Manager
 *
 * 负责消息的发送与接收（路由），支持普通消息与任务消息。
 * 消息持久化到 SQLite，进程退出不丢失。
 */
import type { Storage } from "./storage.js";
import { genConversationId, genMessageId, nowISO } from "./ids.js";
import type {
  Message,
  MessageType,
  SendMessageInput,
  GetMessagesInput,
} from "../models/types.js";

export class MessageManager {
  constructor(private storage: Storage) {}

  /**
   * 发送一条消息。
   * 返回完整消息对象（含生成的 message_id）。
   */
  send(input: SendMessageInput): Message {
    const now = nowISO();
    const message: Message = {
      message_id: genMessageId(),
      task_id: null,
      from: input.from,
      to: input.to,
      type: "message",
      message: input.message,
      status: null,
      conversation_id: input.conversation_id ?? genConversationId(),
      reply_to: input.reply_to ?? null,
      metadata: input.metadata ?? null,
      created_at: now,
      updated_at: now,
    };
    this.storage.insertMessage(message);
    return message;
  }

  /**
   * 写入一条与 Task 关联的消息（由 TaskManager 在创建/回复任务时调用）。
   * 这是内部方法，不对外暴露为 MCP Tool。
   */
  recordTaskMessage(params: {
    task_id: string;
    from: string;
    to: string;
    type: MessageType;
    message: string;
    status: string | null;
    conversation_id: string | null;
  }): Message {
    const now = nowISO();
    const message: Message = {
      message_id: genMessageId(),
      task_id: params.task_id,
      from: params.from,
      to: params.to,
      type: params.type,
      message: params.message,
      status: params.status,
      conversation_id: params.conversation_id,
      reply_to: null,
      metadata: null,
      created_at: now,
      updated_at: now,
    };
    this.storage.insertMessage(message);
    return message;
  }

  /** 获取发给指定 Agent 的消息（按时间升序返回最近 limit 条） */
  getForAgent(input: GetMessagesInput): Message[] {
    const limit = input.limit ?? 20;
    return this.storage.listMessagesFor(input.agent_id, limit);
  }

  get(messageId: string): Message | undefined {
    return this.storage.getMessage(messageId);
  }
}
