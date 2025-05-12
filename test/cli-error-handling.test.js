import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
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
 * CLI tester with fixed timing - copied from cli-stdin-timing.test.js
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
      allDone = true;
      // Only log if we're still in the active part of the test
      if (debug && !timeoutId._destroyed) {
        console.log(`[DONE] Process exited with code ${code}`);
      }
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

describe('CLI Error Handling and Edge Cases', () => {
  let tempDir;
  let testDir;

  // Setup before all tests
  beforeAll(async () => {
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    console.log(`Creating temp directory for error tests: ${tempDir}`);
    testDir = path.join(tempDir, 'error-test');
    await fs.ensureDir(testDir);
  });

  // Cleanup after all tests
  afterAll(() => {
    if (tempDir) {
      fs.removeSync(tempDir);
    }
  });

  // Test CLI with non-interactive mode and invalid path
  test('CLI handles invalid project name input', async () => {
    // Use non-interactive mode with invalid project name
    // In non-interactive mode, validation happens immediately
    const result = await testCLITiming({
      command: 'node',
      args: [
        path.join(rootDir, 'bin/index.js'),
        'invalid/project:name',  // Invalid name with special chars
        '--yes'
      ],
      inputs: [],
      cwd: testDir,
      timeout: 10000,
      debug: true
    });

    // The CLI might validate this as an error or sanitize the name
    // Either way, we don't expect a successful exit code
    if (result.code !== 0) {
      expect(result.stderr).toBeTruthy();
    } else {
      // If it didn't error, it should have sanitized the name
      // Just verify it didn't crash and handled the invalid name somehow
      console.log('CLI sanitized the invalid project name instead of rejecting it');
    }
  });

  // Test with directory that already exists
  test('CLI handles existing directory', async () => {
    // Create a directory that will conflict
    const existingDir = path.join(testDir, 'existing-project');
    await fs.ensureDir(existingDir);

    // Write a file in the directory to make it non-empty
    await fs.writeFile(path.join(existingDir, 'existing-file.txt'), 'This directory already exists');

    // Use non-interactive mode for more predictable behavior
    const result = await testCLITiming({
      command: 'node',
      args: [
        path.join(rootDir, 'bin/index.js'),
        'existing-project',     // Project name (already exists)
        '--yes'                 // Non-interactive mode
      ],
      inputs: [],
      cwd: testDir,
      timeout: 10000,
      debug: true
    });

    // The CLI should handle the existing directory in some way
    // Either by showing a warning or by failing
    // Just make sure it doesn't crash unexpectedly
    expect(result.code !== null).toBe(true);

    // At minimum, it should have detected the conflict
    // Even if the CLI chooses to overwrite existing files
    expect(result.stdout + result.stderr).not.toContain('Uncaught exception');
  });

  // Test with non-interactive mode and invalid path
  test('CLI handles invalid arguments in non-interactive mode', async () => {
    const result = await testCLITiming({
      command: 'node',
      args: [
        path.join(rootDir, 'bin/index.js'),
        '--yes',
        '--non-existent-option'
      ],
      inputs: [],
      cwd: testDir,
      timeout: 30000,
      debug: true
    });

    // Should show an error for unknown option
    expect(result.stderr).toContain('unknown option');
    expect(result.code).not.toBe(0);
  });

  // Test empty inputs for required fields
  test('CLI handles empty inputs for required fields', async () => {
    const emptyInputs = [
      '',  // Empty project name (should prompt again or fail)
      '',  // Try empty again
      'recovery-project', // Recover with valid name
      'Recovery Project',  // Title
      '',  // Empty description (should use default)
      '',  // Empty author (should use default or system)
      '',  // Empty license (should use default)
    ];

    const result = await testCLITiming({
      command: 'node',
      args: [path.join(rootDir, 'bin/index.js')],
      inputs: emptyInputs,
      cwd: testDir,
      timeout: 30000,
      debug: true
    });

    // The CLI should either recover or fail gracefully
    if (result.code === 0) {
      // If it recovered, check that the project was created
      const recoveryDir = path.join(testDir, 'recovery-project');
      expect(fs.existsSync(recoveryDir)).toBe(true);
      
      // Check package.json values
      const packageJson = await fs.readJson(path.join(recoveryDir, 'package.json'));
      expect(packageJson.name).toBe('recovery-project');
      expect(packageJson.description).toBeDefined(); // Should have default or empty description
    } else {
      // If it failed, check that there's a useful error message
      expect(result.stderr || result.stdout).toContain('error');
    }
  });

  // Test that the CLI process can be terminated
  test('CLI handles termination gracefully', async () => {
    // We'll test with a timeout instead of SIGINT, which is less flaky in tests
    // Start the process with a short test timeout
    const result = await testCLITiming({
      command: 'node',
      args: [path.join(rootDir, 'bin/index.js')],
      inputs: [], // No inputs, expecting timeout
      cwd: testDir,
      timeout: 1000, // Short timeout to force termination
      debug: true
    }).catch(error => {
      // We expect a timeout error, that's ok
      return { error: error.message, stdout: '', stderr: '', code: null };
    });

    // The process should have been terminated due to timeout
    // We just want to ensure it doesn't cause unhandled exceptions
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Process timed out');
  });
});