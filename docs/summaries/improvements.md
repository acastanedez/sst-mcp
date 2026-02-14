# SST MCP Server - Improvements Summary

## New Tools Added (10 total)

### 1. **get-sst-logs**
- Get last N lines from `.sst/sst-mcp.log`
- Default: 50 lines
- Quick status checks without reading entire log file

### 2. **get-sst-errors**
- Extract only error messages from logs
- Pattern matching for: error, exception, failed, cannot, unable to, [ERROR], ❌, ✗
- Returns filtered error lines only

### 3. **list-sst-resources**
- List all deployed resources for a stage
- Parses `.sst/outputs.json`
- Shows APIs, functions, buckets, etc.

### 4. **list-sst-stages**
- Show all deployed stages in workspace
- Queries AWS SSM parameters
- Useful for multi-stage management

### 5. **remove-sst-stage**
- Remove a deployed stage
- Runs `sst remove --stage <stage>`
- Clean up unwanted deployments

### 6. **get-sst-env**
- Read current `env.sh` file contents
- View all environment variables

### 7. **set-sst-env**
- Programmatically update `env.sh`
- Pass key-value pairs as JSON object
- Auto-restarts sst dev if running (via file watcher)

### 8. **invoke-sst-function**
- Test Lambda functions directly
- Uses `sst shell` with AWS Lambda invoke
- Pass custom JSON payload

### 9. **cleanup-sst**
- Remove `.sst` directory completely
- Stops sst dev first if running
- Fresh start capability

### 10. **validate-sst-workspace**
- Check if directory is valid SST project
- Verifies: sst.config.ts, package.json, infra/, node_modules/
- Returns validation report

## Enhanced Existing Tools

### **get-sst-status** (improved)
Previously returned: `"yes"` or `"no"`

Now returns detailed JSON:
```json
{
  "running": true,
  "pid": 12345,
  "uptime": "5m 23s",
  "lastLog": "✓ Build complete...",
  "logPath": "/path/to/.sst/sst-mcp.log"
}
```

## Nomenclature Clarification

Updated tool descriptions to distinguish:
- **"live mode"** = `npx sst dev` (local development with hot-reload)
- **"dev mode/stage"** = `npx sst deploy --stage dev` (deployment to AWS dev environment)

## Benefits

1. **Better observability** - Tail logs, filter errors, check detailed status
2. **Resource management** - List/remove stages, view deployed resources
3. **Environment control** - Programmatic env.sh management
4. **Testing capabilities** - Direct function invocation
5. **Maintenance** - Cleanup and validation tools
6. **Clearer intent** - Nomenclature improvements prevent confusion

## Usage Examples

```typescript
// Get last 100 log lines
{ "workspaceRoot": "/path/to/project", "lines": 100 }

// Set environment variables
{ 
  "workspaceRoot": "/path/to/project",
  "variables": {
    "AWS_PROFILE": "my-profile",
    "STAGE": "dev"
  }
}

// Invoke a function
{
  "workspaceRoot": "/path/to/project",
  "functionName": "MyFunction",
  "payload": "{\"test\": true}",
  "stage": "dev"
}
```

## Implementation Notes

- All tools follow consistent error handling patterns
- JSON responses for structured data (status, resources)
- Text responses for logs and human-readable output
- Graceful fallbacks when files don't exist
- Automatic cleanup of stale PID files
