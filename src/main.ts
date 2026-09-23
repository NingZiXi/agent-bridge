/**
 * AgentBridge — 入口
 *
 * 启动 AgentBridge MCP Server（stdio 传输）。
 * 数据库路径通过环境变量 AGENT_BRIDGE_DB 配置，默认 data/agent-bridge.db。
 */
import { Bridge } from "./core/bridge.js";
import { serveMCP, SERVER_NAME, SERVER_VERSION } from "./mcp/server.js";

function main(): void {
  const dbPath = process.env.AGENT_BRIDGE_DB ?? "data/agent-bridge.db";

  // 仅将诊断信息写入 stderr，避免污染 MCP 的 stdio 通道
  process.stderr.write(`[${SERVER_NAME}] v${SERVER_VERSION} starting, db=${dbPath}\n`);

  const bridge = new Bridge({ dbPath });

  // 优雅退出
  const shutdown = () => {
    process.stderr.write(`[${SERVER_NAME}] shutting down\n`);
    bridge.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  serveMCP(bridge).catch((e) => {
    process.stderr.write(`[${SERVER_NAME}] fatal: ${e}\n`);
    bridge.close();
    process.exit(1);
  });
}

main();
