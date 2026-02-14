# SST MCP Server

> **Based on**: [martinpllu/sst-mcp](https://github.com/martinpllu/sst-mcp) - Extended with 28 tools, MCP best practices, and production features.

> **Important ⚠️**: This MCP server **starts and manages the `sst dev` process for you**. Do **not** run `sst dev` manually while the server is in control, otherwise logs will be split between terminals and agents will lose visibility. Capturing the full stdout/stderr stream directly from the spawn process is required to make all build, Vite and Lambda logs available to the agent (see [discussion](https://github.com/sst/sst/issues/5885)).

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that wraps the [SST](https://sst.dev) development experience. It exposes MCP tools that let AI agents manage SST projects, from development to deployment.

## Features

### Development Lifecycle
- **start-sst-dev** – Launch `sst dev --mode=mono` (live mode) with full log capture
- **stop-sst-dev** – Gracefully stop the running SST dev process
- **get-sst-status** – Get detailed JSON status (PID, uptime, last log entry)
- **sst-debug** – Output paths and environment info for troubleshooting

### Deployment & Infrastructure
- **sst-deploy** – Deploy infrastructure and code to AWS (`sst deploy --stage <stage>`)
- **sst-diff** – Preview infrastructure changes before deployment
- **sst-refresh** – Sync local state with cloud provider resources
- **sst-restart-for-infra** – Full workflow: stop dev → deploy → restart dev
- **list-sst-stages** – Show all deployed stages in the workspace
- **remove-sst-stage** – Remove a deployed stage (`sst remove --stage <stage>`)
- **sst-unlock** – Release stuck deployment locks

### Observability
- **get-sst-logs** – Get last N lines from log file (default: 50)
- **get-sst-errors** – Extract only error messages from logs
- **list-sst-resources** – List all deployed resources (APIs, functions, buckets)

### Secret Management
- **sst-secret-set** – Set secret values (supports fallback)
- **sst-secret-get** – Get secret values
- **sst-secret-list** – List all secrets
- **sst-secret-remove** – Remove secrets

### Environment Management
- **get-sst-env** – Read current environment variables from `env.sh`
- **set-sst-env** – Update environment variables (triggers auto-restart if dev is running)
- **sst-shell-exec** – Execute commands with linked resources in environment
- Automatic restart when `env.sh` changes

### Utilities
- **sst-version** – Get current SST CLI version
- **sst-upgrade** – Upgrade SST CLI to specific version
- **invoke-sst-function** – Test Lambda functions directly using `sst shell`
- **validate-sst-workspace** – Check if directory is a valid SST project
- **cleanup-sst** – Remove `.sst` directory, PID files, and logs for fresh start
- **health-check** – Check MCP server health status

### Testing & Maintenance
- **invoke-sst-function** – Test Lambda functions directly using `sst shell`
- **validate-sst-workspace** – Check if directory is a valid SST project
- **cleanup-sst** – Remove `.sst` directory, PID files, and logs for fresh start

## Installation

```bash
pnpm install   # or npm install / yarn install
```

## Usage

### Standalone Mode

Run the MCP server directly:

```bash
pnpm tsx mcp-server.ts
```

### With Cursor

Add to your `.cursor/config.json` or `cursor.json`:

```json
{
  "mcpServers": {
    "sst-mcp": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sst-mcp/mcp-server.ts"]
    }
  }
}
```

Replace `/absolute/path/to/sst-mcp/mcp-server.ts` with the actual path on your machine.

### With Kiro CLI

Add to your Kiro CLI MCP configuration:

```json
{
  "mcpServers": {
    "sst-mcp": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sst-mcp/mcp-server.ts"]
    }
  }
}
```

## Agent Workflow

1. **Start development**: Call `start-sst-dev` with `{ "workspaceRoot": "/path/to/project" }`
2. **Monitor logs**: Tail `.sst/sst-mcp.log` or use `get-sst-logs` / `get-sst-errors`
3. **Check status**: Use `get-sst-status` to verify the dev server is running
4. **Deploy changes**: Use `sst-deploy` for infrastructure changes
5. **Stop development**: Call `stop-sst-dev` when finished

All log output is captured in `.sst/sst-mcp.log`, making build and runtime messages available to agents without additional tooling.

## Environment Variables

Create an `env.sh` file in your project root to inject custom environment variables:

```bash
export AWS_PROFILE=my-profile
export STAGE=dev
export AWS_REGION=us-east-1
```

The server watches this file and automatically restarts the dev process when it changes.

## Architecture

The server uses a centralized configuration system (`config.ts`) that provides:
- Consistent path resolution (`.sst` directory, log files, PID files)
- Configurable commands and arguments
- Default values for stages and options

See [docs/technical/hardcoded-paths-removal.md](./docs/technical/hardcoded-paths-removal.md) for implementation details.

## Development

```bash
pnpm dev          # Start the TypeScript entrypoint (start.ts)
```

## Documentation

- [Documentation Index](./docs/README.md) - Full documentation overview
- [Getting Started Guide](./docs/guides/getting-started.md) - Installation and setup
- [Tool Reference](./docs/reference/tool-reference.md) - Complete tool catalog
- [Architecture](./docs/technical/architecture.md) - System design

## Credits

This project is based on [martinpllu/sst-mcp](https://github.com/martinpllu/sst-mcp) by Martin Plu.

**Enhancements in this version**:
- Expanded from 6 to 28 tools
- Added MCP best practices compliance (rate limiting, timeouts, structured logging)
- Implemented secret management tools
- Added state management (diff, refresh, unlock)
- Centralized configuration system
- Comprehensive documentation
- Production-ready features

## Contributing

Pull requests welcome! Please include tests where relevant.

## License

[MIT](LICENSE) - See LICENSE file for full text including original author credits.
