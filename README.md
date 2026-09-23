# AgentBridge

轻量级、可扩展的 **Agent-to-Agent 通信基础设施**。

AgentBridge 通过 MCP 等标准接口，让 **Codex**、**Qoder CN** 以及未来的 **Claude Code**、**Gemini**、**OpenCode** 等 Agent 之间互相发送消息、派发任务、返回结果。

第一阶段目标：打通 `Codex ↔ AgentBridge ↔ Qoder CN` 的通信闭环。

---

## 设计原则

```text
简单优先      单进程 + SQLite，不引入复杂基础设施
本地优先      本地运行，数据本地持久化
持久化优先    重启后数据、消息、Task 状态不丢失
协议清晰      MCP 标准工具接口，Agent 无关
MCP 优先      第一阶段只实现 MCP 传输
Agent 解耦    Core 不绑定任何具体 Agent
方便扩展      预留 HTTP / WebSocket / 更多 Agent
```

---

## 架构

```text
                 ┌─────────────────────┐
                 │   Agent Bridge MCP  │
                 │                     │
Codex ──MCP────► │  Agent Registry     │
                 │  Message Router     │
Qoder ──MCP────► │  Task Manager       │
                 │  SQLite             │
                 └─────────────────────┘
```

内部结构：

```text
Core
 ├── Agent Manager       —— Agent 注册 / 发现
 ├── Message Manager     —— 消息发送 / 接收
 ├── Task Manager        —— Task 状态机 / 回复
 └── Storage             —— SQLite 持久化

Interfaces
 ├── MCP                 —— 第一阶段已实现
 ├── HTTP                —— 预留
 └── WebSocket           —— 预留
```

Core 层完全 **Agent 无关**，只负责 `Agent / Message / Task / Storage / Routing`。
具体 Agent 的接入逻辑放在 MCP 接口层，未来增加新 Agent 或新接口无需改动 Core。

---

## 项目结构

```text
agent-bridge/
├── src/
│   ├── core/
│   │   ├── agent_manager.ts
│   │   ├── message_manager.ts
│   │   ├── task_manager.ts
│   │   ├── storage.ts
│   │   ├── bridge.ts
│   │   └── ids.ts
│   ├── mcp/
│   │   ├── server.ts
│   │   └── tools.ts
│   ├── models/
│   │   └── types.ts
│   └── main.ts
├── tests/
├── config/
│   ├── codex.config.toml.example      # Codex CLI 接入
│   ├── qoder.mcp.json.example         # Qoder CN CLI 接入
│   ├── qoder-add-mcp.bat              # Qoder CN Windows 一键添加
│   ├── codex-desktop.mcp.json         # Codex 桌面版接入
│   └── qoder-desktop.mcp.json         # Qoder IDE 桌面版接入
├── README.md
├── package.json
├── tsconfig.json
└── LICENSE
```

---

## 快速开始

### 环境要求

- Node.js >= 18

### 安装与构建

```bash
npm install
npm run build
```

构建产物输出到 `dist/`，MCP Server 入口为 `dist/main.js`。

### 直接运行

```bash
node dist/main.js
```

数据库默认写入 `data/agent-bridge.db`，可通过环境变量 `AGENT_BRIDGE_DB` 修改。

---

## MCP Tools

AgentBridge MCP 提供以下 7 个工具：

| 工具 | 说明 |
| --- | --- |
| `agent_register` | 注册 / 刷新 Agent 身份 |
| `agent_list` | 列出所有已注册 Agent |
| `send_message` | 发送消息 |
| `get_messages` | 获取发给指定 Agent 的消息 |
| `create_task` | 创建任务 |
| `get_task` | 查询任务状态与结果 |
| `reply_task` | 回复 / 更新任务状态 |

### 工具示例

**注册 Agent**

```json
{ "agent_id": "codex", "agent_name": "Codex" }
```

**创建任务**

```json
{
  "from": "codex",
  "to": "qoder",
  "message": "检查 STM32 工程中的 LVGL 初始化问题",
  "expects_response": true
}
```

返回：

```json
{ "task_id": "task-xxx", "status": "pending" }
```

**回复任务**

```json
{
  "task_id": "task-xxx",
  "status": "completed",
  "message": "发现 LVGL 初始化存在 xxx 问题"
}
```

Task 状态机：`pending → running → completed | failed | cancelled`

---

## 接入 Codex CLI

在 `~/.codex/config.toml`（或项目级 `.codex/config.toml`）中配置：

```toml
[mcp_servers.agent-bridge]
command = "node"
args = ["dist/main.js"]
env = { "AGENT_BRIDGE_DB" = "data/agent-bridge.db" }
cwd = "/absolute/path/to/agent-bridge"
```

配置后工具名形如 `mcp__agent-bridge__create_task`。完整示例见
[config/codex.config.toml.example](config/codex.config.toml.example)。

也可用 CLI 添加：

```bash
codex mcp add agent-bridge -- node dist/main.js
codex mcp list
```

---

## 接入 Qoder CN CLI

### 方式一：CLI 命令

```bash
qoderclicn mcp add agent-bridge -s user -- node /absolute/path/to/agent-bridge/dist/main.js
qoderclicn mcp list
```

Windows 用户可运行 [config/qoder-add-mcp.bat](config/qoder-add-mcp.bat)。

### 方式二：配置文件

写入 `~/.qoder-cn/settings.json` 或项目级 `.mcp.json`：

```json
{
  "mcpServers": {
    "agent-bridge": {
      "command": "node",
      "args": ["dist/main.js"],
      "env": { "AGENT_BRIDGE_DB": "data/agent-bridge.db" },
      "cwd": "/absolute/path/to/agent-bridge"
    }
  }
}
```

运行中的会话用 `/mcp reload` 重新发现工具。完整示例见
[config/qoder.mcp.json.example](config/qoder.mcp.json.example)。

---

## 接入桌面版（GUI）

如果使用的是 **Qoder IDE 桌面版** 或 **Codex 桌面版（VS Code / IDE 扩展）**，
不用改配置文件或敲命令，直接在图形界面的 MCP 设置里「添加一条 stdio 服务器」即可。

### Qoder IDE 桌面版

1. 打开 Qoder，点右上角**用户图标**（或按 `Ctrl + Shift + ,`）→ **Qoder Settings**。
2. 左侧导航点 **MCP** → **My Servers** 标签页 → 右上角 **+ Add**。
3. 在 JSON 编辑框填入（node 与数据库路径请改成你的实际路径）：

```json
{
  "mcpServers": {
    "agent-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/agent-bridge/dist/main.js"],
      "env": { "AGENT_BRIDGE_DB": "/absolute/path/to/agent-bridge/data/agent-bridge.db" }
    }
  }
}
```

4. 保存后列表中出现 `agent-bridge` 且前面有**链接图标**即连接成功，展开可看到 7 个工具。

### Codex 桌面版（VS Code / IDE）

Codex 桌面版走 VS Code 原生 MCP 配置，写入 `.vscode/mcp.json`（项目级）
或用户级 `%APPDATA%\Code\User\mcp.json`：

```json
{
  "servers": {
    "agent-bridge": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/agent-bridge/dist/main.js"],
      "env": { "AGENT_BRIDGE_DB": "/absolute/path/to/agent-bridge/data/agent-bridge.db" }
    }
  }
}
```

### 桌面版注意事项

- **`command` 建议写 node 的绝对路径**：桌面版启动 MCP 时的环境变量可能与终端不一致，
  写死绝对路径可避免「找不到 node」的报错。
- **两个桌面版必须指向同一个数据库文件**：`AGENT_BRIDGE_DB` 都填同一个
  `data/agent-bridge.db`，否则 Codex 与 Qoder 读写的是不同的库，互相看不到任务。

> 已针对 Windows 生成可直接复制的配置示例（node 绝对路径已写死）：
> [config/qoder-desktop.mcp.json](config/qoder-desktop.mcp.json)、
> [config/codex-desktop.mcp.json](config/codex-desktop.mcp.json)。

---

## 端到端闭环

```text
Codex：“让 Qoder 检查 xxx”
      ↓ create_task(to=qoder)
Qoder：“收到任务”
      ↓ reply_task(status=running)
Qoder：“检查完成，发现 xxx”
      ↓ reply_task(status=completed, message=...)
Codex：“收到结果”
      ↑ get_task(task_id)
```

---

## 测试

```bash
npm test          # 运行全部测试
npm run typecheck # 类型检查
```

测试覆盖：

- Agent 注册与发现
- Codex → Qoder → Codex 完整任务闭环
- Task 状态机
- 非法状态 / 不存在任务的拒绝
- 消息发送与接收
- 重启后持久化恢复
- message_id / task_id 唯一性

---

## 数据模型

三个核心表：

| 表 | 用途 | 唯一约束 |
| --- | --- | --- |
| `agents` | Agent 身份与状态 | `agent_id` |
| `messages` | 消息（含任务消息） | `message_id` |
| `tasks` | 任务 | `task_id` |

消息结构预留 `conversation_id`、`reply_to`、`metadata` 字段，支持后续多轮对话。

---

## 路线图

- [x] 第一阶段：Codex ↔ Qoder CN 通信闭环（MCP + SQLite）
- [ ] 第二阶段：自动唤醒（Qoder ACP / Agent SDK、Codex App Server）
- [ ] Push 通信（Webhook / WebSocket）
- [ ] 跨电脑支持（HTTP / Tailscale / NATS）
- [ ] 手机控制（HTTP API / WebSocket API）
- [ ] 更多 Agent（Claude Code、Gemini、OpenCode）

---

## License

[MIT](LICENSE)
