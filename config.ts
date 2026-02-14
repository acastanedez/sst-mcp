import { join } from 'path';

/**
 * Centralized configuration for SST MCP Server paths and constants
 */
export class SSTConfig {
  // Directory names
  static readonly SST_DIR = '.sst';
  
  // File names
  static readonly LOG_FILE = 'sst-mcp.log';
  static readonly DEPLOY_LOG_FILE = 'sst-deploy.log';
  static readonly PID_FILE = 'sst-dev.pid';
  static readonly ENV_FILE = 'env.sh';
  static readonly OUTPUTS_FILE = 'outputs.json';
  static readonly CONFIG_FILE = 'sst.config.ts';
  static readonly PACKAGE_JSON = 'package.json';
  static readonly INFRA_DIR = 'infra';
  static readonly NODE_MODULES = 'node_modules';

  // Commands
  static readonly SST_COMMAND = 'sst';
  static readonly NPX_COMMAND = 'npx';
  static readonly TSX_COMMAND = 'tsx';

  // SST command arguments
  static readonly SST_DEV_ARGS = ['dev', '--mode=mono'];
  static readonly SST_DEPLOY_ARGS = (stage: string) => ['deploy', '--stage', stage];
  static readonly SST_REMOVE_ARGS = (stage: string) => ['remove', '--stage', stage];

  // Default values
  static readonly DEFAULT_STAGE = 'dev';
  static readonly DEFAULT_LOG_LINES = 50;

  /**
   * Get the .sst directory path for a workspace
   */
  static getSSTDir(workspaceRoot: string): string {
    return join(workspaceRoot, this.SST_DIR);
  }

  /**
   * Get the main log file path
   */
  static getLogPath(workspaceRoot: string): string {
    return join(this.getSSTDir(workspaceRoot), this.LOG_FILE);
  }

  /**
   * Get the deploy log file path
   */
  static getDeployLogPath(workspaceRoot: string): string {
    return join(this.getSSTDir(workspaceRoot), this.DEPLOY_LOG_FILE);
  }

  /**
   * Get the PID file path
   */
  static getPIDPath(workspaceRoot: string): string {
    return join(this.getSSTDir(workspaceRoot), this.PID_FILE);
  }

  /**
   * Get the env.sh file path
   */
  static getEnvPath(workspaceRoot: string): string {
    return join(workspaceRoot, this.ENV_FILE);
  }

  /**
   * Get the outputs.json file path
   */
  static getOutputsPath(workspaceRoot: string): string {
    return join(this.getSSTDir(workspaceRoot), this.OUTPUTS_FILE);
  }

  /**
   * Get the sst.config.ts file path
   */
  static getConfigPath(workspaceRoot: string): string {
    return join(workspaceRoot, this.CONFIG_FILE);
  }

  /**
   * Get the package.json file path
   */
  static getPackageJsonPath(workspaceRoot: string): string {
    return join(workspaceRoot, this.PACKAGE_JSON);
  }

  /**
   * Get the infra directory path
   */
  static getInfraPath(workspaceRoot: string): string {
    return join(workspaceRoot, this.INFRA_DIR);
  }

  /**
   * Get the node_modules directory path
   */
  static getNodeModulesPath(workspaceRoot: string): string {
    return join(workspaceRoot, this.NODE_MODULES);
  }
}
