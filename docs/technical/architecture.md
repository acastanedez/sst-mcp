# Architecture

Technical architecture and design of the SST MCP Server.

## Overview

The SST MCP Server is a production-ready Model Context Protocol server that wraps the SST CLI, providing AI agents with programmatic access to the complete SST development workflow.

## System Architecture

```
┌─────────────────┐
│   MCP Client    │  (Cursor, Kiro CLI, Claude Desktop)
│  (AI Agent)     │
└────────┬────────┘
         │ stdio (JSON-RPC 2.0)
         ▼
┌─────────────────┐
│  MCP SST Server │
│  ┌───────────┐  │
│  │ Rate      │  │  30 req/min
│  │ Limiter   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Input     │  │  Validation
│  │ Validator │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Tool      │  │  28 tools
│  │ Handlers  │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Timeout   │  │  2-5 min
│  │ Manager   │  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ Logger    │  │  Winston
│  │ (Winston) │  │
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   SST CLI       │  (npx sst <command>)
│                 │
│  ┌───────────┐  │
│  │ sst dev   │  │  Live mode
│  └───────────┘  │
│  ┌───────────┐  │
│  │ sst deploy│  │  Deployment
│  └───────────┘  │
│  ┌───────────┐  │
│  │ sst secret│  │  Secrets
│  └───────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      AWS        │
│  ┌───────────┐  │
│  │ Lambda    │  │
│  │ S3        │  │
│  │ DynamoDB  │  │
│  │ etc.      │  │
│  └───────────┘  │
└─────────────────┘
```

## Core Components

### 1. MCP Server (`MCPSSTServer` class)

**Responsibilities**:
- Implement MCP protocol via `@modelcontextprotocol/sdk`
- Register and handle 28 tools
- Manage SST process lifecycle
- Coordinate all subsystems

**Key Methods**:
- `setupToolHandlers()` - Register all tools
- `run()` - Start server on stdio transport

---

### 2. Rate Limiter

**Implementation**: Token bucket algorithm via `limiter` package

**Configuration**:
- 30 tokens per minute
- 1 token per request
- Blocks when exhausted

**Purpose**: Prevent abuse and resource exhaustion

---

### 3. Input Validator

**Method**: `validateWorkspaceRoot()`

**Checks**:
- Parameter is non-empty string
- Path is absolute
- Path exists on filesystem
- No path traversal (resolved path matches input)

**Purpose**: Security and error prevention

---

### 4. Tool Handlers

**Pattern**: Each tool follows the same flow:
1. Validate inputs
2. Log operation start
3. Execute SST command
4. Apply timeout
5. Handle cancellation
6. Return formatted response

**Helper**: `runSSTCommand()` - Generic SST command executor

---

### 5. Timeout Manager

**Implementation**: `withTimeout()` wrapper

**Features**:
- Configurable timeout per operation
- Automatic cleanup
- Cancellation callback support
- Timeout tracking via `operationTimeouts` Map

**Timeouts**:
- Deploy: 5 minutes
- Shell exec: 1 minute
- Others: 2 minutes

---

### 6. Cancellation System

**Implementation**: `cancelHandlers` Map

**Flow**:
1. Register cancel handler when operation starts
2. Store in Map with unique key
3. Call handler on timeout or explicit cancel
4. Clean up handler on completion

**Purpose**: Allow graceful termination of long operations

---

### 7. Structured Logger

**Implementation**: Winston logger

**Transports**:
- `mcp-server.log` - All logs (JSON format)
- `mcp-server-error.log` - Errors only
- Console - Errors only

**Format**: JSON with timestamp, error stack traces

**Log Levels**: error, warn, info, debug

---

### 8. Configuration System

**File**: `config.ts`

**Class**: `SSTConfig`

**Purpose**: Centralize all paths, commands, and constants

**Benefits**:
- Single source of truth
- Easy customization
- No hardcoded values
- Type-safe access

---

## Process Management

### SST Dev Process

**Lifecycle**:
1. `start-sst-dev` spawns `npx tsx start.ts`
2. `start.ts` spawns `npx sst dev --mode=mono`
3. PID written to `.sst/sst-dev.pid`
4. Logs captured to `.sst/sst-mcp.log`
5. `stop-sst-dev` kills process tree
6. PID file removed

**Auto-restart**: Watches `env.sh` for changes

---

### Command Execution

**Method**: `runSSTCommand()`

**Flow**:
1. Spawn `npx sst <args>` in workspace
2. Register cancellation handler
3. Capture stdout/stderr
4. Apply timeout wrapper
5. Return formatted response
6. Clean up handlers

---

## Data Flow

### Tool Invocation

```
AI Agent Request
    ↓
MCP Client (JSON-RPC)
    ↓
MCP Server (stdio)
    ↓
Rate Limiter (check)
    ↓
Input Validator (validate)
    ↓
Tool Handler (execute)
    ↓
runSSTCommand() (spawn)
    ↓
SST CLI (process)
    ↓
AWS (cloud operations)
    ↓
Response (capture output)
    ↓
Format (MCP response)
    ↓
Logger (log result)
    ↓
MCP Client (JSON-RPC)
    ↓
AI Agent Response
```

---

## Security Model

### Defense in Depth

**Layer 1**: MCP client authentication (inherited)  
**Layer 2**: Rate limiting (30 req/min)  
**Layer 3**: Input validation (path checks)  
**Layer 4**: Timeout protection (prevent hangs)  
**Layer 5**: Structured logging (audit trail)

---

## Error Handling

### Error Types

1. **Validation Errors**: Invalid inputs
2. **Process Errors**: SST command failures
3. **Timeout Errors**: Operations exceed limit
4. **Rate Limit Errors**: Too many requests

### Error Response Format

```typescript
{
  content: [{ type: 'text', text: 'Error message' }],
  isError: true  // MCP spec compliant
}
```

### Error Logging

All errors logged with:
- Tool name
- Error message
- Stack trace (if available)
- Context (workspace, stage, etc.)

---

## Performance Characteristics

### Throughput
- **Target**: 30 requests/minute (rate limit)
- **Actual**: Limited by SST CLI performance

### Latency
- **Status checks**: < 100ms
- **Log retrieval**: < 500ms
- **Deployments**: 1-5 minutes (AWS dependent)

### Memory
- **Base**: ~50MB (Node.js + dependencies)
- **Peak**: ~200MB (during builds)

### Concurrency
- **MCP requests**: Sequential (stdio transport)
- **SST operations**: One at a time per workspace

---

## Scalability

### Horizontal Scaling
Not applicable - stdio transport is single-process

### Vertical Scaling
Limited by:
- SST CLI performance
- AWS API rate limits
- Local disk I/O

---

## Dependencies

### Runtime
- Node.js 20+
- `@modelcontextprotocol/sdk` v1.0.0
- `winston` v3.19.0 (logging)
- `limiter` v3.0.0 (rate limiting)
- `chokidar` v4.0.3 (file watching)
- `strip-ansi` v7.1.0 (log cleaning)

### Development
- TypeScript 5.8.3
- tsx 4.20.1

---

## File Structure

```
sst-mcp/
├── mcp-server.ts       # Main MCP server (1518 lines)
├── config.ts           # Centralized configuration
├── start.ts            # SST dev process manager
├── stop.ts             # Process termination
├── deploy.ts           # Deployment runner
├── package.json        # Dependencies
└── docs/               # Documentation
    ├── guides/         # User guides
    ├── reference/      # API reference
    └── technical/      # Technical docs
```

---

## Design Principles

1. **Single Responsibility**: Each tool does one thing well
2. **Fail-Safe**: Graceful degradation under failure
3. **Defense in Depth**: Multiple security layers
4. **Explicit over Implicit**: Clear, predictable behavior
5. **Structured Logging**: Machine-parseable audit trail
6. **Configuration over Code**: Centralized settings

---

## Future Enhancements

Potential improvements:
- Progress notifications for long operations
- State export/import tools
- VPC tunnel management
- Diagnostic report generation
- Multi-workspace support
- WebSocket transport option
