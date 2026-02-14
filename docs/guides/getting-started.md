# Getting Started with SST MCP Server

## Prerequisites

- Node.js 20+ or Bun
- An SST project (or create one with `npx create-sst`)
- MCP-compatible client (Cursor, Kiro CLI, Claude Desktop, etc.)

## Installation

### 1. Install Dependencies

```bash
cd /path/to/sst-mcp
npm install
```

### 2. Configure Your MCP Client

#### For Cursor

Add to `.cursor/config.json`:

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

#### For Kiro CLI

Add to your Kiro MCP configuration:

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

#### For Claude Desktop

Add to `claude_desktop_config.json`:

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

### 3. Verify Installation

Ask your AI agent:
```
"Check the health of the SST MCP server"
```

The agent should use the `health-check` tool and return server status.

## Basic Usage

### Start Development

```
"Start SST in live mode for /path/to/my-project"
```

The agent will:
1. Validate the workspace
2. Start `sst dev` 
3. Capture all logs to `.sst/sst-mcp.log`

### Deploy to Production

```
"Deploy my SST app to production"
```

The agent will:
1. Run `sst deploy --stage production`
2. Show deployment progress
3. Return deployment results

### Manage Secrets

```
"Set the StripeSecret to sk_test_123 for the dev stage"
```

The agent will use `sst-secret-set` to securely store the secret.

## Next Steps

- [Tool Usage Guide](./tool-usage.md) - Learn about all 28 tools
- [Tool Reference](../reference/tool-reference.md) - Complete parameter documentation
- [Architecture](../technical/architecture.md) - Understand how it works
