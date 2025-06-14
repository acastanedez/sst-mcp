## SST MCP Server

> **Important ⚠️**: This MCP server **starts and manages the `sst dev` process for you**. Do **not** run `sst dev` manually while the server is in control, otherwise logs will be split between terminals and agents will lose visibility. Capturing the full stdout/stderr stream directly from the spawn process is required to make all build, Vite and Lambda logs available to the agent (see [discussion](https://github.com/sst/sst/issues/5885)).

A Model Context Protocol (MCP) server that wraps the [SST](https://sst.dev) development experience. It exposes MCP tools that let an AI agent start, stop and inspect an `sst dev` process in a user workspace while capturing logs for analysis.

### Features

• `start-sst-dev` – Launches `sst dev --mode=mono`, writes a PID file to `.sst/sst-dev.pid` and mirrors all output to `.sst/sst-mcp.log`.
• `stop-sst-dev` – Gracefully stops the running SST dev process (falls back to `SIGKILL` if necessary).
• `get-sst-status` – Checks whether an SST dev process is currently running.
• `sst-debug` – Outputs useful paths and environment information for troubleshooting.
• Automatic restart when `env.sh` changes.

---

## Quick start

1. **Install dependencies**

   ```bash
   pnpm install   # or npm install / yarn install
   ```

2. **Run the MCP server locally**

   ```bash
   pnpm tsx mcp-server.ts
   ```

   (When published to npm you can also run `npx sst-mcp`.)

---

## Using with Cursor

Add or merge the following block into your `.cursor/config.json` (or top-level `cursor.json`) so Cursor knows how to spawn this server:

```json
{
  "mcpServers": {
    "sst-mcp": {
      "command": "npx",
      "args": ["tsx", "/path/to/sst-mcp/mcp-server.ts"]
    }
  }
}
```

Replace `/path/to/sst-mcp/…` with the absolute path to the cloned repository on your machine. Cursor will start the server automatically and communicate with it over stdio.

---

## Workflow for agents

1. Call **`start-sst-dev`** with `{ "workspaceRoot": "/absolute/path/to/project" }`.
2. Tail or parse `.sst/sst-mcp.log` for build output and deployment URLs.
3. When finished, call **`stop-sst-dev`**.
4. Use **`get-sst-status`** at any time to confirm whether the dev server is still running.

All log output is captured in `.sst/sst-mcp.log` which means agents can inspect build or runtime messages without additional tooling.

---

## Environment variables

Place an `env.sh` file in your project root to inject custom environment variables into the SST dev process. The server watches this file and restarts the process when it changes.

```bash
export AWS_PROFILE=my-profile
export STAGE=dev
```

---

## Development

• `pnpm dev` – starts the TypeScript entrypoint (`start.ts`) which supervises `sst dev`.
• `pnpm eslint` – run linting (if configured).
• Pull requests welcome! Please include tests where relevant.

---

## License

[MIT](LICENSE)