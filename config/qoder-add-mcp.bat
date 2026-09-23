@echo off
REM AgentBridge — Windows 启动脚本
REM 使用 Qoder CN CLI 添加 AgentBridge 为 stdio MCP server

setlocal

REM 指向本项目的绝对路径
set BRIDGE_DIR=%~dp0..
set BRIDGE_DIR=%BRIDGE_DIR:\=/%

echo Adding AgentBridge to Qoder CN CLI ...
qoderclicn mcp add agent-bridge -s user -- node "%BRIDGE_DIR%/dist/main.js"

echo.
echo Done. Run "qoderclicn mcp list" to verify.
echo Reload inside a running session with /mcp reload
endlocal
