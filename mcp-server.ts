#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, ChildProcess, execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, WriteStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SSTConfig } from './config.js';

class MCPSSTServer {
  private server: Server;
  private sstProcess: ChildProcess | null = null;
  private logStream: WriteStream | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-sst',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'start-sst-dev',
            description: 'Start SST in LIVE MODE by running "npx sst dev". This starts the local development server with hot-reloading for Lambda functions and frontend code. When the user says "start live mode" or "start sst dev", use this tool. All logs are written to .sst/sst-mcp.log for monitoring. NEVER run sst dev manually - always use this tool.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory where SST should run',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'stop-sst-dev',
            description: 'Stop the currently running SST live mode process (sst dev). When the user says "stop live mode" or "stop sst dev", use this tool.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory where SST is running',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'sst-deploy',
            description: 'Deploy to a specific stage using "npx sst deploy --stage <stage>". When the user says "deploy to dev mode" or "deploy to dev stage", use this with stage="dev". When they say "deploy to production" or "deploy to prod stage", use stage="production". This is for deploying infrastructure and code changes to AWS, NOT for local development (use start-sst-dev for that).',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                stage: {
                  type: 'string',
                  description: 'Deployment stage: "dev" for development, "production" for production, or any custom stage name',
                  default: 'dev',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'sst-restart-for-infra',
            description: 'Full infrastructure change workflow: 1) Stop sst dev, 2) Run sst deploy, 3) Restart sst dev. Use this when infrastructure files (infra/*.ts) have been modified and need to be applied while in live mode. Lambda and frontend changes do NOT need this - sst dev handles those automatically.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                stage: {
                  type: 'string',
                  description: 'Deployment stage (defaults to "dev")',
                  default: 'dev',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'get-sst-status',
            description: 'Check if SST live mode (sst dev) is currently running by reading the PID file and verifying the process exists',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory where SST is running',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'sst-debug',
            description: 'Get debug information about MCP server paths and environment for troubleshooting',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'get-sst-logs',
            description: 'Get the last N lines from the SST log file (.sst/sst-mcp.log). Useful for quick status checks without reading the entire log.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                lines: {
                  type: 'number',
                  description: 'Number of lines to return from the end of the log (default: 50)',
                  default: 50,
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'get-sst-errors',
            description: 'Extract and return only error messages from the SST logs. Parses for common error patterns like build failures, deployment errors, and exceptions.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'list-sst-resources',
            description: 'List all deployed SST resources (APIs, functions, buckets, etc.) for a given stage by parsing SST metadata.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                stage: {
                  type: 'string',
                  description: 'Stage to list resources for (default: "dev")',
                  default: 'dev',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'list-sst-stages',
            description: 'List all deployed SST stages in the workspace.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'remove-sst-stage',
            description: 'Remove a deployed SST stage by running "sst remove --stage <stage>".',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                stage: {
                  type: 'string',
                  description: 'REQUIRED: Stage name to remove',
                },
              },
              required: ['workspaceRoot', 'stage'],
            },
          },
          {
            name: 'get-sst-env',
            description: 'Read the current environment variables from env.sh file.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'set-sst-env',
            description: 'Set or update environment variables in the env.sh file. This will trigger an automatic restart of sst dev if it is running.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                variables: {
                  type: 'object',
                  description: 'REQUIRED: Key-value pairs of environment variables to set',
                },
              },
              required: ['workspaceRoot', 'variables'],
            },
          },
          {
            name: 'invoke-sst-function',
            description: 'Invoke a Lambda function directly for testing using "sst shell" or AWS SDK.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
                functionName: {
                  type: 'string',
                  description: 'REQUIRED: Name of the Lambda function to invoke',
                },
                payload: {
                  type: 'string',
                  description: 'JSON payload to send to the function (default: "{}")',
                  default: '{}',
                },
                stage: {
                  type: 'string',
                  description: 'Stage where the function is deployed (default: "dev")',
                  default: 'dev',
                },
              },
              required: ['workspaceRoot', 'functionName'],
            },
          },
          {
            name: 'cleanup-sst',
            description: 'Clean up SST local files (.sst directory, PID files, logs) for a fresh start. Does NOT remove deployed resources.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
              },
              required: ['workspaceRoot'],
            },
          },
          {
            name: 'validate-sst-workspace',
            description: 'Check if the directory is a valid SST project by verifying sst.config.ts exists and other required files.',
            inputSchema: {
              type: 'object',
              properties: {
                workspaceRoot: {
                  type: 'string',
                  description: 'REQUIRED: Absolute path to the workspace/project root directory',
                },
              },
              required: ['workspaceRoot'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'start-sst-dev':
            return await this.startSSTDev(args as { workspaceRoot: string });
          case 'stop-sst-dev':
            return await this.stopSSTDev(args as { workspaceRoot: string });
          case 'sst-deploy':
            return await this.sstDeploy(args as { workspaceRoot: string; stage?: string });
          case 'sst-restart-for-infra':
            return await this.sstRestartForInfra(args as { workspaceRoot: string; stage?: string });
          case 'get-sst-status':
            return await this.getSSTStatus(args as { workspaceRoot: string });
          case 'sst-debug':
            return await this.getSSTDebugInfo(args as { workspaceRoot: string });
          case 'get-sst-logs':
            return await this.getSSTLogs(args as { workspaceRoot: string; lines?: number });
          case 'get-sst-errors':
            return await this.getSSTErrors(args as { workspaceRoot: string });
          case 'list-sst-resources':
            return await this.listSSTResources(args as { workspaceRoot: string; stage?: string });
          case 'list-sst-stages':
            return await this.listSSTStages(args as { workspaceRoot: string });
          case 'remove-sst-stage':
            return await this.removeSSTStage(args as { workspaceRoot: string; stage: string });
          case 'get-sst-env':
            return await this.getSSTEnv(args as { workspaceRoot: string });
          case 'set-sst-env':
            return await this.setSSTEnv(args as { workspaceRoot: string; variables: Record<string, string> });
          case 'invoke-sst-function':
            return await this.invokeSSTFunction(args as { workspaceRoot: string; functionName: string; payload?: string; stage?: string });
          case 'cleanup-sst':
            return await this.cleanupSST(args as { workspaceRoot: string });
          case 'validate-sst-workspace':
            return await this.validateSSTWorkspace(args as { workspaceRoot: string });
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async startSSTDev({ workspaceRoot }: { workspaceRoot: string }) {
    if (this.sstProcess) {
      return {
        content: [
          {
            type: 'text',
            text: 'SST development process is already running. Use stop-sst-dev to stop it first.',
          },
        ],
      };
    }

    try {
      const sstDir = SSTConfig.getSSTDir(workspaceRoot);
      if (!existsSync(sstDir)) {
        mkdirSync(sstDir, { recursive: true });
      }

      const logPath = SSTConfig.getLogPath(workspaceRoot);
      if (existsSync(logPath)) {
        unlinkSync(logPath);
      }

      this.logStream = createWriteStream(logPath, { flags: 'a' });
      const timestamp = new Date().toISOString();
      this.logStream.write(`\n=== SST Dev Started at ${timestamp} ===\n`);

      const mcpServerDir = dirname(fileURLToPath(import.meta.url));
      const startScriptPath = join(mcpServerDir, 'start.ts');

      this.sstProcess = spawn(SSTConfig.NPX_COMMAND, [SSTConfig.TSX_COMMAND, startScriptPath, '--projectRoot', workspaceRoot], {
        cwd: mcpServerDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env,
      });

      if (this.sstProcess.stdout) {
        this.sstProcess.stdout.on('data', (data) => {
          const output = data.toString();
          process.stdout.write(output);
          this.logStream?.write(output);
        });
      }

      if (this.sstProcess.stderr) {
        this.sstProcess.stderr.on('data', (data) => {
          const output = data.toString();
          process.stderr.write(output);
          this.logStream?.write(output);
        });
      }

      this.sstProcess.on('close', (code) => {
        const timestamp = new Date().toISOString();
        const message = `\n=== SST Dev Ended at ${timestamp} with code ${code} ===\n`;
        this.logStream?.write(message);
        this.logStream?.end();
        this.logStream = null;
        this.sstProcess = null;
      });

      this.sstProcess.on('error', (error) => {
        const timestamp = new Date().toISOString();
        const message = `\n=== SST Dev Error at ${timestamp}: ${error.message} ===\n`;
        this.logStream?.write(message);
        console.error('SST Process Error:', error);
      });

      return {
        content: [
          {
            type: 'text',
            text: `SST development process started successfully. Logs are being written to ${logPath}`,
          },
        ],
      };
    } catch (error) {
      if (this.logStream) {
        this.logStream.end();
        this.logStream = null;
      }
      this.sstProcess = null;
      throw new Error(`Failed to start SST process: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async stopSSTDev({ workspaceRoot }: { workspaceRoot: string }) {
    try {
      const mcpServerDir = dirname(fileURLToPath(import.meta.url));
      const stopScriptPath = join(mcpServerDir, 'stop.ts');

      return new Promise<{ content: Array<{ type: string; text: string }> }>((resolve, reject) => {
        const stopProcess = spawn('npx', ['tsx', stopScriptPath, '--projectRoot', workspaceRoot], {
          cwd: mcpServerDir,
          stdio: ['inherit', 'pipe', 'pipe'],
          env: process.env,
        });

        let output = '';
        let errorOutput = '';

        if (stopProcess.stdout) {
          stopProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            process.stdout.write(text);
          });
        }

        if (stopProcess.stderr) {
          stopProcess.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            process.stderr.write(text);
          });
        }

        stopProcess.on('close', (code) => {
          // Clear internal reference since process is stopped
          this.sstProcess = null;
          if (this.logStream) {
            this.logStream.end();
            this.logStream = null;
          }

          if (code === 0) {
            resolve({
              content: [
                {
                  type: 'text',
                  text: output.trim() || 'SST development process has been stopped.',
                },
              ],
            });
          } else {
            reject(new Error(`Stop script failed with code ${code}: ${errorOutput}`));
          }
        });

        stopProcess.on('error', (error) => {
          reject(new Error(`Failed to run stop script: ${error.message}`));
        });
      });
    } catch (error) {
      throw new Error(`Failed to stop SST process: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async sstDeploy({ workspaceRoot, stage = SSTConfig.DEFAULT_STAGE }: { workspaceRoot: string; stage?: string }) {
    const sstDir = SSTConfig.getSSTDir(workspaceRoot);
    if (!existsSync(sstDir)) {
      mkdirSync(sstDir, { recursive: true });
    }

    const logPath = SSTConfig.getLogPath(workspaceRoot);
    const logStream = createWriteStream(logPath, { flags: 'a' });
    const timestamp = new Date().toISOString();
    logStream.write(`\n=== SST Deploy (--stage ${stage}) Started at ${timestamp} ===\n`);

    return new Promise<{ content: Array<{ type: string; text: string }> }>((resolve, reject) => {
      const deployProcess = spawn(SSTConfig.NPX_COMMAND, [SSTConfig.SST_COMMAND, ...SSTConfig.SST_DEPLOY_ARGS(stage)], {
        cwd: workspaceRoot,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env,
      });

      let output = '';
      let errorOutput = '';

      if (deployProcess.stdout) {
        deployProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          process.stdout.write(text);
          logStream.write(text);
        });
      }

      if (deployProcess.stderr) {
        deployProcess.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          process.stderr.write(text);
          logStream.write(text);
        });
      }

      deployProcess.on('close', (code) => {
        const endTimestamp = new Date().toISOString();
        logStream.write(`\n=== SST Deploy Ended at ${endTimestamp} with code ${code} ===\n`);
        logStream.end();

        if (code === 0) {
          resolve({
            content: [
              {
                type: 'text',
                text: `SST deploy --stage ${stage} completed successfully.\n\n${output.trim()}`,
              },
            ],
          });
        } else {
          reject(new Error(`SST deploy failed with code ${code}:\n${errorOutput}\n${output}`));
        }
      });

      deployProcess.on('error', (error) => {
        logStream.end();
        reject(new Error(`Failed to run sst deploy: ${error.message}`));
      });
    });
  }

  private async sstRestartForInfra({ workspaceRoot, stage = SSTConfig.DEFAULT_STAGE }: { workspaceRoot: string; stage?: string }) {
    const sstDir = SSTConfig.getSSTDir(workspaceRoot);
    if (!existsSync(sstDir)) {
      mkdirSync(sstDir, { recursive: true });
    }

    const logPath = SSTConfig.getLogPath(workspaceRoot);
    const logStream = createWriteStream(logPath, { flags: 'a' });
    const timestamp = new Date().toISOString();
    logStream.write(`\n=== SST Infra Restart Workflow Started at ${timestamp} ===\n`);
    logStream.end();

    const steps: string[] = [];

    // Step 1: Stop sst dev
    try {
      steps.push('Step 1: Stopping sst dev...');
      const stopResult = await this.stopSSTDev({ workspaceRoot });
      const stopText = stopResult.content[0]?.text || 'stopped';
      steps.push(`  ✓ ${stopText}`);
    } catch (error) {
      // If stop fails because it's not running, that's fine
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('not running') || msg.includes('no PID')) {
        steps.push('  ✓ SST dev was not running (skipped stop)');
      } else {
        steps.push(`  ⚠ Stop encountered issue: ${msg} (continuing anyway)`);
      }
    }

    // Brief pause to let processes clean up
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Deploy infrastructure
    try {
      steps.push(`Step 2: Deploying infrastructure (--stage ${stage})...`);
      const deployResult = await this.sstDeploy({ workspaceRoot, stage });
      const deployText = deployResult.content[0]?.text || 'deployed';
      steps.push(`  ✓ ${deployText}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      steps.push(`  ✗ Deploy failed: ${msg}`);
      return {
        content: [
          {
            type: 'text',
            text: `Infrastructure restart workflow FAILED at deploy step.\n\n${steps.join('\n')}`,
          },
        ],
      };
    }

    // Brief pause before restarting dev
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Restart sst dev
    try {
      steps.push('Step 3: Restarting sst dev...');
      const startResult = await this.startSSTDev({ workspaceRoot });
      const startText = startResult.content[0]?.text || 'started';
      steps.push(`  ✓ ${startText}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      steps.push(`  ✗ Restart failed: ${msg}`);
      return {
        content: [
          {
            type: 'text',
            text: `Infrastructure deployed but sst dev restart failed.\n\n${steps.join('\n')}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Infrastructure restart workflow completed successfully.\n\n${steps.join('\n')}`,
        },
      ],
    };
  }

  private async getSSTStatus({ workspaceRoot }: { workspaceRoot: string }) {
    const pidFilePath = SSTConfig.getPIDPath(workspaceRoot);
    const logPath = SSTConfig.getLogPath(workspaceRoot);

    if (!existsSync(pidFilePath)) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ running: false, message: 'SST dev is not running' }, null, 2) }],
      };
    }

    try {
      const pidString = readFileSync(pidFilePath, 'utf8').trim();
      const pid = parseInt(pidString, 10);

      if (isNaN(pid)) {
        unlinkSync(pidFilePath);
        return { content: [{ type: 'text', text: JSON.stringify({ running: false, message: 'Invalid PID file' }, null, 2) }] };
      }

      try {
        process.kill(pid, 0);
        
        // Get uptime
        const stats = await import('fs').then(m => m.promises.stat(pidFilePath));
        const startTime = stats.mtime;
        const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);
        const uptimeStr = `${Math.floor(uptime / 60)}m ${uptime % 60}s`;

        // Get last log line
        let lastLog = 'No logs available';
        if (existsSync(logPath)) {
          const logContent = readFileSync(logPath, 'utf8');
          const lines = logContent.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            lastLog = lines[lines.length - 1].substring(0, 200);
          }
        }

        const status = {
          running: true,
          pid,
          uptime: uptimeStr,
          lastLog,
          logPath,
        };

        return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
          unlinkSync(pidFilePath);
        }
        return { content: [{ type: 'text', text: JSON.stringify({ running: false, message: 'Process not found' }, null, 2) }] };
      }
    } catch (error) {
      try { unlinkSync(pidFilePath); } catch { /* ignore */ }
      return { content: [{ type: 'text', text: JSON.stringify({ running: false, message: 'Error checking status' }, null, 2) }] };
    }
  }

  private async getSSTDebugInfo({ workspaceRoot }: { workspaceRoot: string }) {
    try {
      const processCwd = process.cwd();
      const mcpServerDir = dirname(fileURLToPath(import.meta.url));
      const startScriptPath = join(mcpServerDir, 'start.ts');
      const stopScriptPath = join(mcpServerDir, 'stop.ts');
      const packageJsonPath = join(mcpServerDir, 'package.json');
      const workspaceLogPath = SSTConfig.getLogPath(workspaceRoot);
      const workspacePidPath = SSTConfig.getPIDPath(workspaceRoot);
      const sstDir = SSTConfig.getSSTDir(workspaceRoot);

      const debugInfo = [
        `=== MCP Server Debug Information ===`,
        ``,
        `Process CWD: ${processCwd}`,
        `MCP Server Directory: ${mcpServerDir}`,
        `Workspace Root: ${workspaceRoot}`,
        ``,
        `=== File Paths ===`,
        `start.ts path: ${startScriptPath}`,
        `stop.ts path: ${stopScriptPath}`,
        `package.json path: ${packageJsonPath}`,
        `Log file path: ${workspaceLogPath}`,
        `PID file path: ${workspacePidPath}`,
        ``,
        `=== File Existence ===`,
        `start.ts exists: ${existsSync(startScriptPath)}`,
        `stop.ts exists: ${existsSync(stopScriptPath)}`,
        `package.json exists: ${existsSync(packageJsonPath)}`,
        `Log file exists: ${existsSync(workspaceLogPath)}`,
        `PID file exists: ${existsSync(workspacePidPath)}`,
        `Workspace .sst dir exists: ${existsSync(sstDir)}`,
        ``,
        `=== Environment ===`,
        `Node.js version: ${process.version}`,
        `Platform: ${process.platform}`,
        `Architecture: ${process.arch}`,
      ].join('\n');

      return { content: [{ type: 'text', text: debugInfo }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Debug info error: ${error instanceof Error ? error.message : String(error)}` }],
      };
    }
  }

  private async getSSTLogs({ workspaceRoot, lines = SSTConfig.DEFAULT_LOG_LINES }: { workspaceRoot: string; lines?: number }) {
    const logPath = SSTConfig.getLogPath(workspaceRoot);
    
    if (!existsSync(logPath)) {
      return { content: [{ type: 'text', text: 'No log file found. SST has not been started yet.' }] };
    }

    try {
      const content = readFileSync(logPath, 'utf8');
      const allLines = content.split('\n');
      const lastLines = allLines.slice(-lines).join('\n');
      
      return { content: [{ type: 'text', text: lastLines || 'Log file is empty.' }] };
    } catch (error) {
      throw new Error(`Failed to read logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getSSTErrors({ workspaceRoot }: { workspaceRoot: string }) {
    const logPath = SSTConfig.getLogPath(workspaceRoot);
    
    if (!existsSync(logPath)) {
      return { content: [{ type: 'text', text: 'No log file found.' }] };
    }

    try {
      const content = readFileSync(logPath, 'utf8');
      const lines = content.split('\n');
      const errorPatterns = [
        /error:/i,
        /exception/i,
        /failed/i,
        /cannot/i,
        /unable to/i,
        /\[ERROR\]/i,
        /❌/,
        /✗/,
      ];

      const errors = lines.filter(line => 
        errorPatterns.some(pattern => pattern.test(line)) && line.trim().length > 0
      );

      if (errors.length === 0) {
        return { content: [{ type: 'text', text: 'No errors found in logs.' }] };
      }

      return { content: [{ type: 'text', text: errors.join('\n') }] };
    } catch (error) {
      throw new Error(`Failed to parse errors: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listSSTResources({ workspaceRoot, stage = SSTConfig.DEFAULT_STAGE }: { workspaceRoot: string; stage?: string }) {
    const metadataPath = SSTConfig.getOutputsPath(workspaceRoot);
    
    if (!existsSync(metadataPath)) {
      return { content: [{ type: 'text', text: `No outputs.json found. Deploy SST first with stage "${stage}".` }] };
    }

    try {
      const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
      const formatted = JSON.stringify(metadata, null, 2);
      
      return { content: [{ type: 'text', text: `SST Resources (stage: ${stage}):\n\n${formatted}` }] };
    } catch (error) {
      throw new Error(`Failed to read resources: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listSSTStages({ workspaceRoot }: { workspaceRoot: string }) {
    try {
      const result = execSync('npx sst shell -- aws ssm get-parameters-by-path --path /sst/ --query "Parameters[*].Name" 2>/dev/null || echo "[]"', {
        cwd: workspaceRoot,
        encoding: 'utf8',
      });

      const stages = new Set<string>();
      const lines = result.split('\n');
      
      for (const line of lines) {
        const match = line.match(/\/sst\/([^\/]+)\//);
        if (match) stages.add(match[1]);
      }

      if (stages.size === 0) {
        return { content: [{ type: 'text', text: 'No stages found or unable to query AWS.' }] };
      }

      return { content: [{ type: 'text', text: `Deployed stages:\n${Array.from(stages).map(s => `  - ${s}`).join('\n')}` }] };
    } catch (error) {
      return { content: [{ type: 'text', text: 'Unable to list stages. Ensure AWS credentials are configured.' }] };
    }
  }

  private async removeSSTStage({ workspaceRoot, stage }: { workspaceRoot: string; stage: string }) {
    return new Promise<{ content: Array<{ type: string; text: string }> }>((resolve, reject) => {
      const removeProcess = spawn(SSTConfig.NPX_COMMAND, [SSTConfig.SST_COMMAND, ...SSTConfig.SST_REMOVE_ARGS(stage)], {
        cwd: workspaceRoot,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env,
      });

      let output = '';
      let errorOutput = '';

      if (removeProcess.stdout) {
        removeProcess.stdout.on('data', (data) => {
          const text = data.toString();
          output += text;
          process.stdout.write(text);
        });
      }

      if (removeProcess.stderr) {
        removeProcess.stderr.on('data', (data) => {
          const text = data.toString();
          errorOutput += text;
          process.stderr.write(text);
        });
      }

      removeProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ content: [{ type: 'text', text: `Stage "${stage}" removed successfully.\n\n${output}` }] });
        } else {
          reject(new Error(`Failed to remove stage "${stage}" (code ${code}):\n${errorOutput}`));
        }
      });

      removeProcess.on('error', (error) => {
        reject(new Error(`Failed to run sst remove: ${error.message}`));
      });
    });
  }

  private async getSSTEnv({ workspaceRoot }: { workspaceRoot: string }) {
    const envPath = SSTConfig.getEnvPath(workspaceRoot);
    
    if (!existsSync(envPath)) {
      return { content: [{ type: 'text', text: 'No env.sh file found.' }] };
    }

    try {
      const content = readFileSync(envPath, 'utf8');
      return { content: [{ type: 'text', text: content }] };
    } catch (error) {
      throw new Error(`Failed to read env.sh: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async setSSTEnv({ workspaceRoot, variables }: { workspaceRoot: string; variables: Record<string, string> }) {
    const envPath = SSTConfig.getEnvPath(workspaceRoot);
    
    try {
      let content = '';
      
      if (existsSync(envPath)) {
        content = readFileSync(envPath, 'utf8');
      }

      const lines = content.split('\n');
      const existingVars = new Map<string, number>();
      
      lines.forEach((line, idx) => {
        const match = line.match(/^export\s+([A-Z_][A-Z0-9_]*)=/);
        if (match) existingVars.set(match[1], idx);
      });

      for (const [key, value] of Object.entries(variables)) {
        const newLine = `export ${key}="${value}"`;
        
        if (existingVars.has(key)) {
          lines[existingVars.get(key)!] = newLine;
        } else {
          lines.push(newLine);
        }
      }

      const { writeFileSync } = await import('fs');
      writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');

      return { content: [{ type: 'text', text: `Environment variables updated in env.sh. SST dev will auto-restart if running.` }] };
    } catch (error) {
      throw new Error(`Failed to update env.sh: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async invokeSSTFunction({ workspaceRoot, functionName, payload = '{}', stage = SSTConfig.DEFAULT_STAGE }: { workspaceRoot: string; functionName: string; payload?: string; stage?: string }) {
    return new Promise<{ content: Array<{ type: string; text: string }> }>((resolve, reject) => {
      const invokeProcess = spawn(SSTConfig.NPX_COMMAND, [SSTConfig.SST_COMMAND, 'shell', '--stage', stage, '--', 'aws', 'lambda', 'invoke', '--function-name', functionName, '--payload', payload, '/dev/stdout'], {
        cwd: workspaceRoot,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env,
      });

      let output = '';
      let errorOutput = '';

      if (invokeProcess.stdout) {
        invokeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      if (invokeProcess.stderr) {
        invokeProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      invokeProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ content: [{ type: 'text', text: `Function "${functionName}" invoked:\n\n${output}` }] });
        } else {
          reject(new Error(`Failed to invoke function (code ${code}):\n${errorOutput}`));
        }
      });

      invokeProcess.on('error', (error) => {
        reject(new Error(`Failed to invoke function: ${error.message}`));
      });
    });
  }

  private async cleanupSST({ workspaceRoot }: { workspaceRoot: string }) {
    const sstDir = SSTConfig.getSSTDir(workspaceRoot);
    
    if (!existsSync(sstDir)) {
      return { content: [{ type: 'text', text: 'No .sst directory found. Nothing to clean up.' }] };
    }

    try {
      await this.stopSSTDev({ workspaceRoot }).catch(() => {});
      
      const { rmSync } = await import('fs');
      rmSync(sstDir, { recursive: true, force: true });
      
      return { content: [{ type: 'text', text: 'SST local files cleaned up successfully. .sst directory removed.' }] };
    } catch (error) {
      throw new Error(`Failed to cleanup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async validateSSTWorkspace({ workspaceRoot }: { workspaceRoot: string }) {
    const checks = [
      { file: SSTConfig.CONFIG_FILE, required: true },
      { file: SSTConfig.PACKAGE_JSON, required: true },
      { file: SSTConfig.INFRA_DIR, required: false, isDir: true },
      { file: SSTConfig.NODE_MODULES, required: false, isDir: true },
    ];

    const results: string[] = ['=== SST Workspace Validation ===', ''];
    let isValid = true;

    for (const check of checks) {
      const path = join(workspaceRoot, check.file);
      const exists = existsSync(path);
      
      if (check.required && !exists) {
        results.push(`✗ ${check.file} - MISSING (required)`);
        isValid = false;
      } else if (exists) {
        results.push(`✓ ${check.file} - found`);
      } else {
        results.push(`  ${check.file} - not found (optional)`);
      }
    }

    results.push('');
    results.push(isValid ? 'Workspace is valid ✓' : 'Workspace is INVALID - missing required files ✗');

    return { content: [{ type: 'text', text: results.join('\n') }] };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP SST Server running on stdio');
  }
}

const server = new MCPSSTServer();
server.run().catch(console.error);
