#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, ChildProcess } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, WriteStream } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

class MCPSSTServer {
  private server: Server;
  private sstProcess: ChildProcess | null = null;
  private logStream: WriteStream | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-sst',
        version: '1.0.0',
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
            description: 'Start the SST process by running \'sst dev\'. The workspaceRoot parameter is REQUIRED and should be the absolute path to the user\'s workspace/project directory. All logs from the SST process will be written to .sst/sst-mcp.log in the workspace root. This means the agent can access all SST logs by reading that file, enabling monitoring and analysis of the SST server\'s output. NEVER try to start sst dev yourself unless explicitly instructed - always use this tool.',
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
            description: 'Stop the currently running SST development process using the PID file. The workspaceRoot parameter is REQUIRED and should be the absolute path to the user\'s workspace/project directory where the SST process was started.',
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
            name: 'get-sst-status',
            description: 'Check if the SST development process is currently running by reading the PID file and verifying the process exists',
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
          
          case 'get-sst-status':
            return await this.getSSTStatus(args as { workspaceRoot: string });
          
          case 'sst-debug':
            return await this.getSSTDebugInfo(args as { workspaceRoot: string });

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
      // Ensure the .sst directory exists
      const sstDir = join(workspaceRoot, '.sst');
      if (!existsSync(sstDir)) {
        mkdirSync(sstDir, { recursive: true });
      }

      // Create log file path
      const logPath = join(sstDir, 'sst-mcp.log');
      
      // Delete existing log file to start fresh
      if (existsSync(logPath)) {
        unlinkSync(logPath);
      }
      
      // Create write stream for logging
      this.logStream = createWriteStream(logPath, { flags: 'a' });
      
      // Add timestamp to log
      const timestamp = new Date().toISOString();
      this.logStream.write(`\n=== SST Dev Started at ${timestamp} ===\n`);

      // Get the actual directory where this MCP server file is located
      const mcpServerDir = dirname(fileURLToPath(import.meta.url));
      const startScriptPath = join(mcpServerDir, 'start.ts');
      
      // Spawn the SST process
      this.sstProcess = spawn('pnpm', ['tsx', startScriptPath, '--projectRoot', workspaceRoot], {
        cwd: mcpServerDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: process.env,
      });

      // Pipe stdout and stderr to both console and log file
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

      // Handle process events
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
      // Clean up on error
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
      // Use stop.ts script to stop the SST process
      const stopScriptPath = join(process.cwd(), 'stop.ts');
      
      return new Promise<{ content: Array<{ type: string; text: string }> }>((resolve, reject) => {
        const stopProcess = spawn('pnpm', ['tsx', stopScriptPath, '--projectRoot', workspaceRoot], {
          cwd: process.cwd(),
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

  private async getSSTStatus({ workspaceRoot }: { workspaceRoot: string }) {
    const pidFilePath = join(workspaceRoot, '.sst', 'sst-dev.pid');
    
    // Check if PID file exists
    if (!existsSync(pidFilePath)) {
      return {
        content: [
          {
            type: 'text',
            text: 'no',
          },
        ],
      };
    }

    try {
      // Read PID from file
      const pidString = readFileSync(pidFilePath, 'utf8').trim();
      const pid = parseInt(pidString, 10);

      if (isNaN(pid)) {
        // Invalid PID, delete the file
        unlinkSync(pidFilePath);
        return {
          content: [
            {
              type: 'text',
              text: 'no',
            },
          ],
        };
      }

      // Check if process exists
      try {
        process.kill(pid, 0); // Signal 0 checks if process exists without killing it
        // Process exists
        return {
          content: [
            {
              type: 'text',
              text: 'yes',
            },
          ],
        };
      } catch (error) {
        // Process doesn't exist, delete the PID file
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
          unlinkSync(pidFilePath);
        }
        return {
          content: [
            {
              type: 'text',
              text: 'no',
            },
          ],
        };
      }
    } catch (error) {
      // Error reading PID file, try to delete it
      try {
        unlinkSync(pidFilePath);
      } catch {
        // Ignore errors when trying to delete
      }
      return {
        content: [
          {
            type: 'text',
            text: 'no',
          },
        ],
      };
    }
  }

  private async getSSTDebugInfo({ workspaceRoot }: { workspaceRoot: string }) {
    try {
      // Get all the debug information
      const processCwd = process.cwd();
      const mcpServerDir = dirname(fileURLToPath(import.meta.url));
      const startScriptPath = join(mcpServerDir, 'start.ts');
      const stopScriptPath = join(mcpServerDir, 'stop.ts');
      const packageJsonPath = join(mcpServerDir, 'package.json');
      const workspaceLogPath = join(workspaceRoot, '.sst', 'sst-mcp.log');
      const workspacePidPath = join(workspaceRoot, '.sst', 'sst-dev.pid');

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
        `Workspace .sst dir exists: ${existsSync(join(workspaceRoot, '.sst'))}`,
        ``,
        `=== Environment ===`,
        `Node.js version: ${process.version}`,
        `Platform: ${process.platform}`,
        `Architecture: ${process.arch}`,
      ].join('\n');

      return {
        content: [
          {
            type: 'text',
            text: debugInfo,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Debug info error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP SST Server running on stdio');
  }
}

const server = new MCPSSTServer();
server.run().catch(console.error);