# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)，格式基于
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.1.0] - 2026-09-24

### 新增

- 第一阶段核心实现：`Codex ↔ AgentBridge ↔ Qoder CN` 的 Agent-to-Agent 通信闭环。
- Core 层（Agent 无关）：Agent Manager、Message Manager、Task Manager、SQLite Storage。
- 7 个 MCP Tool：`agent_register`、`agent_list`、`send_message`、`get_messages`、
  `create_task`、`get_task`、`reply_task`。
- Task 状态机：`pending → running → completed | failed | cancelled`。
- 消息结构预留 `conversation_id`、`reply_to`、`metadata` 字段。
- 接入配置：Codex CLI / Qoder CN CLI / Codex 桌面版 / Qoder IDE 桌面版。
- 完整测试（Node 内置 test runner），覆盖闭环、状态机、持久化、id 唯一性。
- README、CONTRIBUTING、CODE_OF_CONDUCT、Issue/PR 模板、CI 工作流。

[0.1.0]: https://github.com/NingZiXi/agent-bridge/releases/tag/v0.1.0
