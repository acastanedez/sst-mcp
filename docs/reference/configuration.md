# Configuration Reference

Environment variables and configuration options for the SST MCP Server.

## Environment Variables

### MCP_LOG_LEVEL
**Type**: `string`  
**Default**: `"info"`  
**Options**: `"error"`, `"warn"`, `"info"`, `"debug"`

Controls the logging verbosity of the MCP server.

```bash
MCP_LOG_LEVEL=debug npx tsx mcp-server.ts
```

---

### SST_STAGE
**Type**: `string`  
**Default**: Current username

Sets the default stage for SST operations.

```bash
SST_STAGE=production npx tsx mcp-server.ts
```

---

### SST_TELEMETRY_DISABLED
**Type**: `boolean`  
**Default**: `false`

Disable SST telemetry collection.

```bash
SST_TELEMETRY_DISABLED=1 npx tsx mcp-server.ts
```

---

## Log Files

### mcp-server.log
**Location**: Root directory  
**Content**: All MCP server logs in JSON format

Contains structured logs of all operations, tool invocations, and errors.

---

### mcp-server-error.log
**Location**: Root directory  
**Content**: Error-level logs only

Contains only errors for quick troubleshooting.

---

### .sst/sst-mcp.log
**Location**: Workspace `.sst/` directory  
**Content**: SST process output

Contains all output from `sst dev`, `sst deploy`, and other SST commands.

---

## Rate Limiting

**Default**: 30 requests per minute

Cannot be configured. This prevents abuse and ensures server stability.

---

## Timeouts

### Default Timeout
**Value**: 2 minutes (120,000ms)

Applies to most operations.

### Deploy Timeout
**Value**: 5 minutes (300,000ms)

Applies to `sst-deploy` and `sst-restart-for-infra`.

### Shell Exec Timeout
**Value**: 1 minute (60,000ms)

Applies to `sst-shell-exec`.

---

## MCP Client Configuration

### Cursor

File: `.cursor/config.json`

```json
{
  "mcpServers": {
    "sst-mcp": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sst-mcp/mcp-server.ts"],
      "env": {
        "MCP_LOG_LEVEL": "info",
        "SST_STAGE": "dev"
      }
    }
  }
}
```

### Kiro CLI

File: Kiro MCP configuration

```json
{
  "mcpServers": {
    "sst-mcp": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/sst-mcp/mcp-server.ts"],
      "env": {
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Claude Desktop

File: `claude_desktop_config.json`

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

---

## SST Configuration

### env.sh
**Location**: Project root  
**Purpose**: Environment variables for SST

The MCP server watches this file and auto-restarts `sst dev` when it changes.

Example:
```bash
export AWS_PROFILE=my-profile
export AWS_REGION=us-east-1
export STAGE=dev
```

---

## Centralized Configuration

The server uses `config.ts` for all paths and constants:

- `.sst` directory name
- Log file names
- PID file names
- Command names (`npx`, `sst`, `tsx`)
- Default values (stage, log lines, etc.)

This ensures consistency and makes customization easy.

---

## Security Considerations

### Authentication
The MCP server uses stdio transport and inherits security from the parent process (MCP client). No additional authentication is required.

### Input Validation
All `workspaceRoot` parameters are validated to:
- Be absolute paths
- Exist on the filesystem
- Not contain path traversal attacks

### Rate Limiting
30 requests per minute prevents abuse and resource exhaustion.

### Secrets
Secrets are encrypted and stored in S3 by SST. The MCP server never logs secret values.

---

## Troubleshooting

### Enable Debug Logging

```bash
MCP_LOG_LEVEL=debug npx tsx mcp-server.ts
```

### Check Log Files

```bash
# MCP server logs
tail -f mcp-server.log

# SST process logs
tail -f /path/to/project/.sst/sst-mcp.log
```

### Clear State

```bash
# Remove .sst directory
rm -rf /path/to/project/.sst
```

---

## Performance Tuning

### Adjust Concurrency (SST Deploy)

```bash
# Build 2 sites concurrently
SST_BUILD_CONCURRENCY_SITE=2 sst deploy

# Build 8 functions concurrently
SST_BUILD_CONCURRENCY_FUNCTION=8 sst deploy

# Build 2 containers concurrently
SST_BUILD_CONCURRENCY_CONTAINER=2 sst deploy
```

These environment variables are passed through to SST commands.
