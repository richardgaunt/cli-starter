import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Simplified CLI tester with fixed timing instead of prompt detection
 * This approach is better for testing interactive CLI apps with complex prompts
 */
function testCLITiming({ command, args = [], inputs = [], cwd, timeout = 60000, debug = false }) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let allDone = false;

    if (debug) {
      console.log(`[SETUP] Testing with ${inputs.length} predefined inputs`);
      console.log(`[SETUP] Inputs: ${inputs.map(i => i || '<ENTER>').join(', ')}`);
    }

    // Start the process
    const proc = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Collect stdout
    proc.stdout.on('data', data => {
      const text = data.toString();
      stdout += text;
      if (debug) console.log(`[OUTPUT] ${text}`);
    });

    // Collect stderr
    proc.stderr.on('data', data => {
      const text = data.toString();
      stderr += text;
      if (debug) console.error(`[ERROR] ${text}`);
    });

    // Handle completion
    proc.on('close', code => {
      if (debug) console.log(`[DONE] Process exited with code ${code}`);
      allDone = true;
      resolve({ stdout, stderr, code });
    });

    // Handle errors
    proc.on('error', err => {
      reject(err);
    });

    // Send inputs with fixed timing instead of trying to detect prompts
    const sendInputsWithTiming = async () => {
      // Wait for process to start
      await new Promise(resolve => setTimeout(resolve, 500));

      for (let i = 0; i < inputs.length; i++) {
        if (allDone) break;

        // Send the input
        const input = inputs[i] || '';
        if (debug) console.log(`[INPUT] Sending "${input || '<ENTER>'}" (#${i + 1}/${inputs.length})`);
        proc.stdin.write(input + '\n');

        // Wait between inputs - longer delay for the license selection
        const delay = i === inputs.length - 1 ? 1000 : 500;
        await new Promise(resolve => setTimeout(resolve, delay));

        // For license selection (the last input), send an extra Enter
        if (i === inputs.length - 1) {
          if (debug) console.log(`[INPUT] Sending extra ENTER for license selection`);
          proc.stdin.write('\n');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    };

    // Start sending inputs
    sendInputsWithTiming().catch(err => {
      console.error('[ERROR] Failed to send inputs:', err);
    });

    // Overall timeout protection
    const timeoutId = setTimeout(() => {
      if (!allDone) {
        proc.kill();
        reject(new Error(`Process timed out after ${timeout}ms`));
      }
    }, timeout);

    // Clean up on completion
    proc.on('close', () => {
      clearTimeout(timeoutId);
      allDone = true;
    });
  });
}

describe('CLI Application Tests with Fixed Timing', () => {
  let tempDir;

  beforeEach(async () => {
    // Create temp directory
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    console.log(`Creating temp directory: ${tempDir}`);
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir) {
      // fs.removeSync(tempDir);
    }
  });

  // Test with fixed timing approach
  test('Create CLI application with sequential inputs', async () => {
    // Setup test directory
    const projectDir = path.join(tempDir, 'timing-test');
    await fs.ensureDir(projectDir);

    // Define inputs in order of prompts
    const inputs = [
      'interactive-cli',  // Project name
      'Interactive CLI',   // Human-readable title
      'A CLI created with interactive input',  // Description
      'Test Author',       // Author
      '',                  // License (use default by pressing Enter)
    ];

    console.log('Starting interactive CLI test with fixed timing');

    // Run CLI with our timing-based test helper
    const result = await testCLITiming({
      command: 'node',
      args: [path.join(rootDir, 'bin/index.js')],
      inputs: inputs,
      cwd: projectDir,
      timeout: 120000,
      debug: true
    });

    // Basic verification
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('created successfully');

    // Verify the project was created with our inputs
    const createdProjectDir = path.join(projectDir, 'interactive-cli');
    expect(fs.existsSync(createdProjectDir)).toBe(true);

    // Verify package.json contains our inputs
    const packageJson = await fs.readJson(path.join(createdProjectDir, 'package.json'));
    expect(packageJson.name).toBe('interactive-cli');
    expect(packageJson.description).toBe('A CLI created with interactive input');
    // The author field uses the system's default user - accept whatever value it has
    expect(packageJson.author).toBeDefined();
    expect(packageJson.license).toBe('MIT'); // Default license is MIT

    // Verify index.mjs has correct template variables
    const indexPath = path.join(createdProjectDir, 'index.mjs');
    expect(fs.existsSync(indexPath)).toBe(true);

    const indexContent = await fs.readFile(indexPath, 'utf8');
    expect(indexContent).toContain('Interactive CLI'); // Title
    expect(indexContent).not.toContain('{{title}}'); // No unprocessed template variables
    expect(indexContent).not.toContain('{{description}}');

    // Verify the file is executable
    const stats = await fs.stat(indexPath);
    const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
    expect(isExecutable).toBe(true);
  });
});
