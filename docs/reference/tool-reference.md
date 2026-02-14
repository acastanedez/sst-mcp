# Tool Reference

Complete reference for all 28 SST MCP tools.

## Development Lifecycle (4 tools)

### start-sst-dev
Start SST in live mode with hot-reloading.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Start SST in live mode for /home/user/my-app"`

**What it does**: Runs `npx sst dev --mode=mono`, captures logs to `.sst/sst-mcp.log`

---

### stop-sst-dev
Stop the running SST live mode server.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Stop SST dev"`

---

### get-sst-status
Get detailed status of SST development server.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Returns**: JSON with PID, uptime, last log entry, running status

**Example**: `"What's the status of SST?"`

---

### sst-debug
Get debug information about MCP server and environment.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Returns**: Paths, file existence, Node version, platform info

**Example**: `"Give me SST debug info"`

---

## Deployment & Infrastructure (7 tools)

### sst-deploy
Deploy infrastructure and code to AWS stage.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `stage` (optional): Stage name (default: "dev")

**Example**: `"Deploy to production"`

**Timeout**: 5 minutes

---

### sst-diff
Preview infrastructure changes before deployment.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `target` (optional): Specific component to diff
- `dev` (optional): Compare to dev version

**Example**: `"Show me what will change if I deploy"`

---

### sst-refresh
Sync local state with cloud provider resources.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `target` (optional): Specific component to refresh

**Example**: `"Refresh the SST state"`

**Use case**: Detect drift between state and actual resources

---

### sst-restart-for-infra
Stop dev, deploy infrastructure, restart dev.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `stage` (optional): Stage name (default: "dev")

**Example**: `"Restart for infrastructure changes"`

**Use case**: When you modify `infra/*.ts` files

---

### list-sst-stages
List all deployed SST stages.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Show me all deployed stages"`

---

### remove-sst-stage
Remove a deployed SST stage.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `stage` (required): Stage name to remove

**Example**: `"Remove the old-feature stage"`

---

### sst-unlock
Release stuck deployment lock.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Unlock the deployment"`

**Use case**: Fix concurrent deployment issues

---

## Observability (3 tools)

### get-sst-logs
Get last N lines from SST log file.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `lines` (optional): Number of lines (default: 50)

**Example**: `"Show me the last 100 lines of logs"`

---

### get-sst-errors
Extract only error messages from logs.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Show me all errors"`

**Patterns detected**: error, exception, failed, cannot, unable to, [ERROR], ❌, ✗

---

### list-sst-resources
List all deployed resources for a stage.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `stage` (optional): Stage name (default: "dev")

**Example**: `"List all resources in production"`

**Returns**: APIs, functions, buckets, databases, etc.

---

## Secret Management (4 tools)

### sst-secret-set
Set a secret value.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `name` (required): Secret name
- `value` (required): Secret value
- `fallback` (optional): Set as fallback value

**Example**: `"Set StripeSecret to sk_test_123"`

**With fallback**: `"Set ApiKey as fallback value"`

---

### sst-secret-get
Get a secret value.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `name` (required): Secret name
- `fallback` (optional): Get fallback value

**Example**: `"Get the DatabasePassword secret"`

---

### sst-secret-list
List all secrets.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `fallback` (optional): List fallback secrets

**Example**: `"Show me all secrets"`

---

### sst-secret-remove
Remove a secret.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `name` (required): Secret name
- `fallback` (optional): Remove fallback value

**Example**: `"Remove the OldApiKey secret"`

---

## Environment Management (3 tools)

### get-sst-env
Read environment variables from env.sh.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Show me the environment variables"`

---

### set-sst-env
Update environment variables in env.sh.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `variables` (required): Key-value pairs

**Example**: `"Set AWS_PROFILE to production"`

**Note**: Triggers auto-restart if dev is running

---

### sst-shell-exec
Execute command with linked resources in environment.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `command` (required): Command to execute
- `target` (optional): Specific component context

**Example**: `"Run 'node scripts/migrate.js' with SST resources"`

**Timeout**: 1 minute

---

## Utilities (7 tools)

### sst-version
Get current SST CLI version.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"What version of SST is installed?"`

---

### sst-upgrade
Upgrade SST CLI to specific version.

**Parameters**:
- `version` (optional): Version to upgrade to (default: latest)

**Example**: `"Upgrade SST to version 3.0.0"`

---

### invoke-sst-function
Test Lambda function directly.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory
- `functionName` (required): Lambda function name
- `payload` (optional): JSON payload (default: "{}")
- `stage` (optional): Stage name (default: "dev")

**Example**: `"Invoke the ProcessOrder function with payload {orderId: 123}"`

---

### validate-sst-workspace
Check if directory is a valid SST project.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Validate the SST workspace"`

**Checks**: sst.config.ts, package.json, infra/, node_modules/

---

### cleanup-sst
Remove .sst directory and local files.

**Parameters**:
- `workspaceRoot` (required): Absolute path to project directory

**Example**: `"Clean up SST local files"`

**Note**: Does NOT remove deployed resources

---

### health-check
Check MCP server health status.

**Parameters**: None

**Example**: `"Check the health of the MCP server"`

**Returns**: Status, uptime, memory, active operations, SST process status

---

## Rate Limiting

All tools are rate-limited to **30 requests per minute** to prevent abuse.

If you hit the limit, wait 60 seconds and retry.

---

## Timeouts

| Operation | Timeout |
|-----------|---------|
| sst-deploy | 5 minutes |
| sst-shell-exec | 1 minute |
| All others | 2 minutes |

Operations that timeout will be automatically cancelled.
