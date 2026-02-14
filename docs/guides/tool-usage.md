# Tool Usage Guide

Complete guide to using all 28 SST MCP tools effectively.

## Understanding Tool Categories

### Development Lifecycle
Tools for local development with hot-reloading.

### Deployment & Infrastructure  
Tools for deploying and managing cloud resources.

### Observability
Tools for monitoring and debugging.

### Secret Management
Tools for secure credential storage.

### Environment Management
Tools for configuration and environment variables.

### Utilities
Helper tools for maintenance and diagnostics.

---

## Common Workflows

### 1. Starting a New Development Session

**Goal**: Start working on an SST project locally

**Steps**:
1. Validate workspace: `"Validate the SST workspace at /path/to/project"`
2. Start live mode: `"Start SST in live mode"`
3. Monitor logs: `"Show me the last 50 lines of SST logs"`

**Tools Used**: `validate-sst-workspace`, `start-sst-dev`, `get-sst-logs`

---

### 2. Deploying Infrastructure Changes

**Goal**: Deploy changes to infrastructure code

**Steps**:
1. Preview changes: `"Show me what will change if I deploy"`
2. Deploy: `"Deploy to dev stage"`
3. Verify: `"List all resources in dev stage"`

**Tools Used**: `sst-diff`, `sst-deploy`, `list-sst-resources`

---

### 3. Managing Secrets

**Goal**: Set up application secrets

**Steps**:
1. Set secret: `"Set DatabasePassword to xyz123"`
2. Set fallback: `"Set StripeKey as fallback value"`
3. List all: `"Show me all secrets"`

**Tools Used**: `sst-secret-set`, `sst-secret-list`

---

### 4. Debugging Issues

**Goal**: Troubleshoot deployment or runtime issues

**Steps**:
1. Check status: `"What's the status of SST dev?"`
2. Get errors: `"Show me all errors from the logs"`
3. Get debug info: `"Give me SST debug information"`

**Tools Used**: `get-sst-status`, `get-sst-errors`, `sst-debug`

---

### 5. State Management

**Goal**: Sync state with cloud resources

**Steps**:
1. Check drift: `"Refresh the SST state"`
2. Preview changes: `"Show me the diff"`
3. Deploy if needed: `"Deploy the changes"`

**Tools Used**: `sst-refresh`, `sst-diff`, `sst-deploy`

---

### 6. Running Scripts with Resources

**Goal**: Execute a database migration or admin script

**Steps**:
1. Execute: `"Run 'node scripts/migrate.js' with SST resources linked"`

**Tools Used**: `sst-shell-exec`

---

### 7. Multi-Stage Management

**Goal**: Manage multiple deployment stages

**Steps**:
1. List stages: `"Show me all deployed stages"`
2. Deploy to new stage: `"Deploy to staging stage"`
3. Remove old stage: `"Remove the old-feature stage"`

**Tools Used**: `list-sst-stages`, `sst-deploy`, `remove-sst-stage`

---

### 8. Recovering from Issues

**Goal**: Fix stuck deployments or corrupted state

**Steps**:
1. Unlock: `"Unlock the deployment"`
2. Refresh state: `"Refresh the SST state"`
3. Retry: `"Deploy again"`

**Tools Used**: `sst-unlock`, `sst-refresh`, `sst-deploy`

---

## Important Distinctions

### "Live Mode" vs "Dev Stage"

**Live Mode** = Local development
- Command: `"Start live mode"` or `"Start SST dev"`
- Runs: `npx sst dev`
- Tool: `start-sst-dev`
- Hot-reloading enabled

**Dev Stage** = Cloud deployment
- Command: `"Deploy to dev"` or `"Deploy to dev stage"`
- Runs: `npx sst deploy --stage dev`
- Tool: `sst-deploy` with `stage="dev"`
- Deploys to AWS

---

## Tips & Best Practices

### 1. Always Validate First
Before starting development, validate the workspace to catch issues early.

### 2. Use Diff Before Deploy
Preview changes with `sst-diff` to avoid surprises.

### 3. Monitor Logs Regularly
Use `get-sst-logs` to stay informed about build progress and errors.

### 4. Set Fallback Secrets
Use `--fallback` flag for secrets that should apply to all stages.

### 5. Clean Up Old Stages
Regularly remove unused stages to reduce AWS costs.

### 6. Use Shell Exec for Scripts
Run migrations and admin tasks with `sst-shell-exec` to access resources.

### 7. Check Health Periodically
Use `health-check` to ensure the MCP server is running properly.

---

## Troubleshooting

### "Rate limit exceeded"
The server limits requests to 30 per minute. Wait a moment and retry.

### "Workspace validation failed"
Ensure you're in a valid SST project directory with `sst.config.ts`.

### "Deployment timeout"
Long deployments may timeout. Check logs with `get-sst-logs` for progress.

### "Process already running"
Stop the existing process with `stop-sst-dev` before starting a new one.

---

## Next Steps

- [Tool Reference](../reference/tool-reference.md) - Complete parameter documentation
- [Configuration](../reference/configuration.md) - Environment variables and settings
