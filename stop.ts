#!/usr/bin/env node

import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

interface StopOptions {
  projectRoot: string;
}

function parseArgs(): StopOptions {
  const args = process.argv.slice(2);
  let projectRoot = '.';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--projectRoot' && i + 1 < args.length) {
      projectRoot = args[i + 1];
      i++; // Skip the next argument since it's the value
    }
  }

  return { projectRoot };
}

async function stopSST(projectRoot: string): Promise<void> {
  const pidFilePath = join(projectRoot, '.sst', 'sst-dev.pid');
  
  // Check if PID file exists
  if (!existsSync(pidFilePath)) {
    console.log('SST development process is not running (no PID file found)');
    process.exit(0);
  }

  try {
    // Read PID from file
    const pidString = readFileSync(pidFilePath, 'utf8').trim();
    const pid = parseInt(pidString, 10);

    if (isNaN(pid)) {
      console.error('Invalid PID found in PID file');
      process.exit(1);
    }

    console.log(`Stopping SST process with PID: ${pid}`);

    // Try to kill the process
    try {
      // Check if process exists first
      process.kill(pid, 0); // Signal 0 checks if process exists without killing it
      
      // If we get here, process exists, so kill it
      process.kill(pid, 'SIGTERM');
      
      // Give it a moment to terminate gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if it's still running and force kill if necessary
      try {
        process.kill(pid, 0);
        console.log('Process did not terminate gracefully, forcing kill...');
        process.kill(pid, 'SIGKILL');
        
        // Give it another moment after force kill
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        // Process is already dead, which is what we want
      }
      
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        console.log('SST process was already stopped (process not found)');
      } else {
        console.error('Failed to stop SST process:', error);
        process.exit(1);
      }
    }

    // Verify the process is actually stopped before cleaning up PID file
    try {
      process.kill(pid, 0);
      console.error('Process is still running after kill attempts');
      process.exit(1);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        // Process is confirmed dead, safe to clean up PID file
        console.log('SST development process stopped successfully');
        
        try {
          unlinkSync(pidFilePath);
          console.log('PID file cleaned up');
        } catch (error) {
          console.warn('Failed to remove PID file:', error);
        }
      } else {
        console.error('Error checking process status:', error);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('Error reading PID file:', error);
    process.exit(1);
  }
}

async function main() {
  const { projectRoot } = parseArgs();
  await stopSST(projectRoot);
}

main().catch(console.error); 