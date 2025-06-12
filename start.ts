import { spawn, ChildProcess } from 'child_process';
import stripAnsi from 'strip-ansi';
import { createWriteStream, readFileSync, promises as fsPromises } from 'fs';
import { watch } from 'chokidar';
import { EOL } from 'os';
import psTree from 'ps-tree';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse command line arguments for project root
const argv = yargs(hideBin(process.argv))
  .option('projectRoot', {
    alias: 'r',
    type: 'string',
    description: 'Path to the project root',
    default: '.',
  })
  .help()
  .argv;

const projectRoot = path.resolve(argv.projectRoot as string);
const logFilePath = path.join(projectRoot, '.sst/local-app.log');
const envFilePath = path.join(projectRoot, 'env.sh');

let childProcess: ChildProcess | null = null;

function parseEnvFile(filePath: string): { [key: string]: string } {
    const env: { [key: string]: string } = {};
    try {
        const fileContent = readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const match = trimmedLine.match(/^(?:export\s+)?([\w.-]+)=(.*)/);
                if (match) {
                    let value = match[2] || '';
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length - 1);
                    }
                    env[match[1]] = value;
                }
            }
        }
    } catch (error) {
        if (isNodeError(error) && error.code !== 'ENOENT') {
            console.error(`Error reading env file: ${error.message}`);
        }
    }
    return env;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return error instanceof Error;
}

async function startProcess() {
    if (childProcess) {
        if (childProcess.pid) {
            await killProcessAndChildren(childProcess.pid, 'SIGKILL');
        }
        childProcess = null;
        console.log('Restarting process...');
    }

    await fsPromises.mkdir(path.dirname(logFilePath), { recursive: true });
    const logStream = createWriteStream(logFilePath, { flags: 'a' });

    const env = parseEnvFile(envFilePath);
    
    console.log('Starting SST dev process...');
    
    childProcess = spawn('pnpm', ['sst', 'dev', '--mode=mono'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: projectRoot,
        env: {
            ...process.env,
            ...env,
        },
    });

    childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        const cleanedData = stripAnsi(text);
        process.stdout.write(text);
        logStream.write(cleanedData);
    });

    childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        const cleanedData = stripAnsi(text);
        process.stderr.write(text);
        logStream.write(cleanedData);
    });

    childProcess.on('exit', (code) => {
        console.log(`Process exited with code: ${code}`);
        logStream.end();
        childProcess = null;
    });
}

function killProcessAndChildren(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    return new Promise((resolve, reject) => {
        psTree(pid, (err, children) => {
            if (err) {
                return reject(err);
            }
            const pids = [pid, ...children.map(p => parseInt(p.PID, 10))];
            pids.forEach(p => {
                try {
                    process.kill(p, signal);
                } catch (e) {
                    // Ignore
                }
            });
            resolve();
        });
    });
}


async function handleExit() {
    if (childProcess?.pid) {
        try {
            await killProcessAndChildren(childProcess.pid);
        } catch (e) {
            console.error('Failed to kill process tree:', e);
        }
    }
    process.exit();
}

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

async function main() {
    await startProcess();

    const watcher = watch(envFilePath, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher.on('change', async (path) => {
        console.log(`${EOL}Detected change in ${path}. Restarting the process...`);
        await startProcess();
    });
}

main().catch(console.error); 