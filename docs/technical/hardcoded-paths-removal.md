# Hardcoded Path Removal - Summary

## Problem
The codebase had numerous hardcoded paths and values scattered throughout:
- `.sst` directory references
- File names like `sst-mcp.log`, `sst-dev.pid`, `env.sh`, `outputs.json`
- Commands like `npx`, `sst`, `tsx`
- Default values like `'dev'` stage, `50` log lines

This made the code:
- Hard to maintain (changes required updates in multiple places)
- Difficult to customize (no central configuration)
- Error-prone (typos could break functionality)

## Solution
Created a centralized `config.ts` module with the `SSTConfig` class that provides:

### Constants
- Directory names: `SST_DIR = '.sst'`
- File names: `LOG_FILE`, `PID_FILE`, `ENV_FILE`, `OUTPUTS_FILE`, `CONFIG_FILE`, etc.
- Commands: `NPX_COMMAND`, `SST_COMMAND`, `TSX_COMMAND`
- Default values: `DEFAULT_STAGE = 'dev'`, `DEFAULT_LOG_LINES = 50`

### Helper Methods
- `getSSTDir(workspaceRoot)` - Get .sst directory path
- `getLogPath(workspaceRoot)` - Get log file path
- `getPIDPath(workspaceRoot)` - Get PID file path
- `getEnvPath(workspaceRoot)` - Get env.sh path
- `getOutputsPath(workspaceRoot)` - Get outputs.json path
- `getConfigPath(workspaceRoot)` - Get sst.config.ts path
- `getPackageJsonPath(workspaceRoot)` - Get package.json path
- `getInfraPath(workspaceRoot)` - Get infra directory path
- `getNodeModulesPath(workspaceRoot)` - Get node_modules path
- `SST_DEV_ARGS` - Array of sst dev arguments
- `SST_DEPLOY_ARGS(stage)` - Array of sst deploy arguments
- `SST_REMOVE_ARGS(stage)` - Array of sst remove arguments

## Files Updated

### config.ts (NEW)
- Centralized configuration class
- All paths, commands, and constants in one place

### mcp-server.ts
Replaced hardcoded values in:
- `startSSTDev()` - Log path, SST dir, commands
- `stopSSTDev()` - PID path
- `sstDeploy()` - Log path, SST dir, commands, default stage
- `sstRestartForInfra()` - Log path, SST dir, default stage
- `getSSTStatus()` - PID path, log path
- `getSSTDebugInfo()` - All paths
- `getSSTLogs()` - Log path, default lines
- `getSSTErrors()` - Log path
- `listSSTResources()` - Outputs path, default stage
- `removeSSTStage()` - Commands
- `getSSTEnv()` - Env path
- `setSSTEnv()` - Env path
- `invokeSSTFunction()` - Commands, default stage
- `cleanupSST()` - SST dir
- `validateSSTWorkspace()` - All file names

### start.ts
- Import SSTConfig
- Use `getLogPath()`, `getEnvPath()`, `getPIDPath()`, `getSSTDir()`
- Use `NPX_COMMAND`, `SST_COMMAND`, `SST_DEV_ARGS`

### stop.ts
- Import SSTConfig
- Use `getPIDPath()`

### deploy.ts
- Import SSTConfig
- Use `getDeployLogPath()`, `DEFAULT_STAGE`
- Use `NPX_COMMAND`, `SST_COMMAND`, `SST_DEPLOY_ARGS()`

## Benefits

1. **Single Source of Truth** - All paths and constants defined once
2. **Easy Customization** - Change values in one place
3. **Type Safety** - TypeScript ensures correct usage
4. **Maintainability** - Easier to update and refactor
5. **Consistency** - No typos or inconsistencies across files
6. **Testability** - Can mock SSTConfig for testing
7. **Documentation** - Clear JSDoc comments explain each method

## Example Usage

Before:
```typescript
const logPath = join(workspaceRoot, '.sst', 'sst-mcp.log');
const pidPath = join(workspaceRoot, '.sst', 'sst-dev.pid');
spawn('npx', ['sst', 'deploy', '--stage', 'dev'], ...);
```

After:
```typescript
const logPath = SSTConfig.getLogPath(workspaceRoot);
const pidPath = SSTConfig.getPIDPath(workspaceRoot);
spawn(SSTConfig.NPX_COMMAND, [SSTConfig.SST_COMMAND, ...SSTConfig.SST_DEPLOY_ARGS('dev')], ...);
```

## Future Enhancements

The config system can be extended to support:
- Environment variable overrides (e.g., `SST_LOG_FILE`)
- Configuration file loading (e.g., `.sstmcprc`)
- Per-workspace customization
- Runtime configuration changes
