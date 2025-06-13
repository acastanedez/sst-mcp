# MCP Server for SST

This MCP server provides actions for working with SST projects, including starting the SST dev server and making all logs available for agent analysis.

## Features
- **Start SST Dev Server**: Runs `sst dev` via `start.ts` and writes all logs to `.sst/sst-mcp.log`.
- **MCP Integration**: Exposes an HTTP API for use with Cursor's MCP agent system.

## Setup

1. **Install dependencies:**
   ```sh
   pnpm install
   ```

2. **Run the MCP server:**
   ```sh
   pnpm tsx mcp-server.ts
   ```
   By default, the server will run on `http://localhost:3000`.

3. **Add the server to Cursor:**
   - Open Cursor.
   - Go to the MCP agent configuration.
   - Import or reference the provided `mcp.config.json` file in your project root.
   - The `start` action will be available, which starts the SST dev server and logs output to `.sst/sst-mcp.log`.

## How it works
- When you invoke the `start` action, the server runs `start.ts`, which in turn runs `sst dev` for your project.
- All logs from the SST process are written to `.sst/sst-mcp.log`.
- The MCP agent (or you) can read this log file to monitor and analyze the SST server's output.

## Customization
- You can specify a different project root by passing the `projectRoot` parameter to the `start` action.

---

**Note:** Only one SST server should be running per project. The system will detect and prevent multiple instances. 