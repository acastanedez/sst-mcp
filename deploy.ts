#!/usr/bin/env node

import { spawn } from 'child_process';
import { createWriteStream, promises as fsPromises } from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import stripAnsi from 'strip-ansi';
import { SSTConfig } from './config.js';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('projectRoot', {
    alias: 'r',
    type: 'string',
    description: 'Path to the project root',
    default: '.',
  })
  .option('stage', {
    alias: 's',
    type: 'string',
    description: 'Deployment stage (dev, production, etc.)',
    default: SSTConfig.DEFAULT_STAGE,
  })
  .help()
  .parseSync();

const projectRoot = path.resolve(argv.projectRoot as string);
const stage = argv.stage as string;
const logFilePath = SSTConfig.getDeployLogPath(projectRoot);

async function deploySST() {
  console.log(`Starting SST deployment to stage: ${stage}...`);
  
  await fsPromises.mkdir(path.dirname(logFilePath), { recursive: true });
  const logStream = createWriteStream(logFilePath, { flags: 'a' });
  
  const timestamp = new Date().toISOString();
  logStream.write(`\n=== SST Deploy Started at ${timestamp} (stage: ${stage}) ===\n`);

  return new Promise<void>((resolve, reject) => {
    const deployProcess = spawn(SSTConfig.NPX_COMMAND, [SSTConfig.SST_COMMAND, ...SSTConfig.SST_DEPLOY_ARGS(stage)], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: projectRoot,
      env: process.env,
    });

    deployProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      const cleanedData = stripAnsi(text);
      process.stdout.write(text);
      logStream.write(cleanedData);
    });

    deployProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      const cleanedData = stripAnsi(text);
      process.stderr.write(text);
      logStream.write(cleanedData);
    });

    deployProcess.on('exit', (code) => {
      const timestamp = new Date().toISOString();
      const message = `\n=== SST Deploy Ended at ${timestamp} with code ${code} ===\n`;
      logStream.write(message);
      logStream.end();
      
      if (code === 0) {
        console.log('SST deployment completed successfully');
        resolve();
      } else {
        reject(new Error(`SST deployment failed with exit code ${code}`));
      }
    });

    deployProcess.on('error', (error) => {
      const timestamp = new Date().toISOString();
      const message = `\n=== SST Deploy Error at ${timestamp}: ${error.message} ===\n`;
      logStream.write(message);
      logStream.end();
      reject(error);
    });
  });
}

async function main() {
  try {
    await deploySST();
    process.exit(0);
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

main();
