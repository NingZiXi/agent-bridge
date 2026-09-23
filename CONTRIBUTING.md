# Contributing to AgentBridge

感谢你对 AgentBridge 的关注！本文件说明如何参与贡献。

## 项目定位

AgentBridge 是一个轻量级、可扩展的 **Agent-to-Agent 通信基础设施**，通过 MCP 等标准接口
让 Codex、Qoder CN 及未来的 Claude Code、Gemini、OpenCode 等 Agent 互相发送消息、派发任务、返回结果。

核心设计原则：**简单优先、本地优先、持久化优先、协议清晰、MCP 优先、Agent 解耦、方便扩展**。

## 开发环境

- Node.js >= 18
- npm

```bash
git clone https://github.com/NingZiXi/agent-bridge.git
cd agent-bridge
npm install
npm run build
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run build` | 编译 TypeScript 到 `dist/` |
| `npm test` | 运行全部测试（Node 内置 test runner） |
| `npm run typecheck` | 类型检查 |
| `npm run dev` | 开发模式（tsx 热重载） |

## 代码结构

```text
src/
├── core/      Agent 无关的核心层（Agent/Message/Task Manager + Storage）
├── mcp/       MCP Server 与 7 个 Tool
├── models/    领域类型定义
└── main.ts    入口

tests/         测试（node:test）
config/        各客户端接入配置示例（.example 后缀）
```

## 提交规范

- 提交信息使用 [Conventional Commits](https://www.conventionalcommits.org/) 风格：
  `feat:` / `fix:` / `docs:` / `test:` / `refactor:` / `chore:`
- 提交前请运行 `npm test` 和 `npm run typecheck`，确保全部通过。

## 关键约定

1. **Core 层必须保持 Agent 无关**。不要在 `src/core/` 里写入任何 Codex / Qoder 特有逻辑；
   具体 Agent 的接入放到 `src/mcp/` 或未来的 Adapter 层。
2. **命名统一为 AgentBridge**，禁止将名称绑定到具体 Agent
   （如 `Codex-Qoder`、`Qoder-Codex-Bridge`）。
3. **配置示例使用占位符**，不要提交包含真实本机路径或密钥的文件；示例文件以 `.example` 结尾。
4. **测试使用 Node 内置 `node:test`**，不要引入 vitest / jest 等额外测试框架。

## 提交流程

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feat/your-feature`
3. 提交修改并推送
4. 发起 Pull Request，描述清楚改动动机与影响范围

## 问题反馈

遇到 bug 或有功能建议，欢迎提交 [Issue](https://github.com/NingZiXi/agent-bridge/issues)。
