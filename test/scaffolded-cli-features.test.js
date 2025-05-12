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

describe('Scaffolded CLI Application Features', () => {
  let tempDir;
  let projectDir;
  let scaffoldedDir;

  // Create a temp dir and generate a CLI project before all tests
  beforeAll(async () => {
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    console.log(`Creating temp directory for scaffolded tests: ${tempDir}`);
    projectDir = path.join(tempDir, 'scaffolded-test');
    await fs.ensureDir(projectDir);

    // Create a new CLI project for testing
    const inputs = [
      'feature-test-cli',        // Project name
      'Feature Test CLI',        // Title
      'A CLI for testing features', // Description
      'Test Author',             // Author
      '',                        // License (default)
    ];

    console.log('Creating a CLI application for feature testing...');

    // Run the CLI generator
    const result = await testCLITiming({
      command: 'node',
      args: [path.join(rootDir, 'bin/index.js')],
      inputs: inputs,
      cwd: projectDir,
      timeout: 120000,
      debug: true
    });

    if (result.code !== 0) {
      throw new Error('Failed to create CLI application: ' + result.stderr);
    }

    // Set the path to the scaffolded app
    scaffoldedDir = path.join(projectDir, 'feature-test-cli');
    
    // Verify project was created
    if (!fs.existsSync(scaffoldedDir)) {
      throw new Error('Scaffolded project directory not found');
    }

    console.log(`Scaffolded project created at: ${scaffoldedDir}`);
  });

  // Clean up after all tests
  afterAll(() => {
    if (tempDir) {
      fs.removeSync(tempDir);
    }
  });

  // Test ANSI color rendering in terminal output
  test('Terminal output uses ANSI colors correctly', async () => {
    // Interactive mode with color output
    const interactiveInputs = [
      'configure',        // Select configure option
      'Color Test'        // Name input
    ];

    const result = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs')],
      inputs: interactiveInputs,
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify colored output with ANSI escape sequences
    expect(result.stdout).toMatch(/\u001b\[3\dm/); // Match any ANSI color code
    expect(result.stdout).toMatch(/\u001b\[32m/);  // Match green color code
    expect(result.stdout).toMatch(/\u001b\[34m/);  // Match blue color code
  });

  // Test command line arguments parsing
  test('Parse and handle command line arguments correctly', async () => {
    // Test with the version flag
    const versionResult = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs'), '--version'],
      inputs: [],
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify version output
    expect(versionResult.code).toBe(0);
    expect(versionResult.stdout).toMatch(/1\.0\.0/);

    // Test with explicit configure command
    const configureResult = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs'), 'configure'],
      inputs: ['Commander Test'],
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify the command ran successfully
    expect(configureResult.code).toBe(0);
    expect(configureResult.stdout).toContain('What is your name?');
    expect(configureResult.stdout).toContain('Hello, Commander Test!');
  });

  // Test interactive prompt handling
  test('Handle interactive prompts correctly with various inputs', async () => {
    // Test with default value
    const defaultInputs = [
      'configure',
      ''  // Empty input should use default value
    ];

    const defaultResult = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs')],
      inputs: defaultInputs,
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify default value was used
    expect(defaultResult.stdout).toContain('Hello, world!');

    // Test with custom input
    const customInputs = [
      'configure',
      'Custom Input'
    ];

    const customResult = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs')],
      inputs: customInputs,
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify custom input was used
    expect(customResult.stdout).toContain('Hello, Custom Input!');
  });

  // Test error handling in the scaffolded CLI
  test('Handle errors gracefully in the scaffolded CLI', async () => {
    // Test with invalid command
    const invalidResult = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs'), 'invalid-command'],
      inputs: [],
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify error message - either stderr contains 'error' or stdout contains 'unknown command'
    // The Commander.js library might put errors in stderr or stdout based on configuration
    const output = invalidResult.stderr + invalidResult.stdout;
    expect(
      output.toLowerCase().includes('error') ||
      output.toLowerCase().includes('unknown') ||
      output.toLowerCase().includes('invalid')
    ).toBe(true);
    
    // Test with invalid option
    const invalidOptionResult = await testCLITiming({
      command: 'node',
      args: [path.join(scaffoldedDir, 'index.mjs'), '--invalid-option'],
      inputs: [],
      cwd: scaffoldedDir,
      timeout: 30000,
      debug: true
    });

    // Verify error message for invalid option
    expect(invalidOptionResult.stderr).toContain('unknown option');
  });

  // Test the template variables were properly substituted
  test('Verify template variables were properly substituted', async () => {
    // Read the index.mjs file
    const indexContent = await fs.readFile(path.join(scaffoldedDir, 'index.mjs'), 'utf8');
    
    // Check that all template variables were substituted
    expect(indexContent).not.toContain('{{');
    expect(indexContent).not.toContain('}}');
    
    // Check specific substitutions
    expect(indexContent).toContain('Feature Test CLI');
    expect(indexContent).toContain('A CLI for testing features');
    
    // Verify the correct structure of the CLI
    expect(indexContent).toContain('export function registerCommands');
    expect(indexContent).toContain('export async function main');
    expect(indexContent).toContain('export async function showMainMenu');
    expect(indexContent).toContain('export async function helloWorld');
  });
});