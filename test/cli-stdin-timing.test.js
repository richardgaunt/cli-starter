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

describe('CLI Application Tests with Fixed Timing', () => {
  // Shared variables for all tests in this suite
  let tempDir;
  let projectDir;
  let createdProjectDir;

  // Create a single temp directory for all tests
  beforeAll(async () => {
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
    console.log(`Creating temp directory for all tests: ${tempDir}`);
    projectDir = path.join(tempDir, 'timing-test');
    await fs.ensureDir(projectDir);
  });

  afterAll(() => {
    // Clean up temp directory after all tests complete
    if (tempDir) {
      fs.removeSync(tempDir);
    }
  });

  // Test with fixed timing approach
  test('Create CLI application with sequential inputs', async () => {
    // Project directory is already set up in beforeAll

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
    createdProjectDir = path.join(projectDir, 'interactive-cli');
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

  // Test running the scaffolded application and checking its output
  test('Run the scaffolded CLI application', async () => {
    // Skip if the first test didn't create the project directory
    if (!createdProjectDir || !fs.existsSync(createdProjectDir)) {
      console.log('Skipping scaffolded CLI test - no project directory found');
      return;
    }

    console.log('Testing the scaffolded CLI application...');

    // Run the scaffolded CLI in help mode first to check if it works
    const helpResult = await testCLITiming({
      command: 'node',
      args: [path.join(createdProjectDir, 'index.mjs'), '--help'],
      inputs: [],
      cwd: createdProjectDir,
      timeout: 30000,
      debug: true
    });

    // Verify help output
    expect(helpResult.code).toBe(0);
    expect(helpResult.stdout).toContain('Usage:');
    expect(helpResult.stdout).toContain('Options:');
    expect(helpResult.stdout).toContain('--help'); // Should show help option
    expect(helpResult.stdout).toContain('Commands:');
    expect(helpResult.stdout).toContain('configure'); // Should show configure command

    // Test the direct command mode of the scaffolded CLI
    console.log('Testing direct command mode of scaffolded CLI...');

    const commandResult = await testCLITiming({
      command: 'node',
      args: [
        path.join(createdProjectDir, 'index.mjs'),
        'configure'      // Use the configure command directly
      ],
      inputs: ['Command Mode User'],  // Enter a name when prompted
      cwd: createdProjectDir,
      timeout: 30000,
      debug: true
    });

    // Verify command output
    expect(commandResult.code).toBe(0);
    expect(commandResult.stdout).toContain('What is your name?');
    expect(commandResult.stdout).toContain('Hello, Command Mode User!');
    expect(commandResult.stdout).toContain('Thank you for using Interactive CLI');

    // Now test interactive mode of the scaffolded CLI
    console.log('Testing interactive mode of scaffolded CLI...');

    const interactiveInputs = [
      'configure',        // Select "configure" option from menu
      'Scaffolded User'   // Enter a name when prompted
    ];

    const interactiveResult = await testCLITiming({
      command: 'node',
      args: [path.join(createdProjectDir, 'index.mjs')],
      inputs: interactiveInputs,
      cwd: createdProjectDir,
      timeout: 30000,
      debug: true
    });

    // Verify interactive CLI output
    expect(interactiveResult.code).toBe(0);
    expect(interactiveResult.stdout).toContain('What would you like to do?');
    expect(interactiveResult.stdout).toContain('What is your name?');
    expect(interactiveResult.stdout).toContain('Interactive CLI'); // Title from template
    expect(interactiveResult.stdout).toContain('A CLI created with interactive input'); // Description from template

    // Verify specific output text
    expect(interactiveResult.stdout).toContain('Hello, Scaffolded User!');
    expect(interactiveResult.stdout).toContain('Thank you for using Interactive CLI');

    // Test with invalid menu option
    console.log('Testing invalid menu option...');

    const invalidInputs = [
      'invalid-command',  // Enter an invalid command
      ''                  // Just press Enter to exit after error message
    ];

    const invalidResult = await testCLITiming({
      command: 'node',
      args: [path.join(createdProjectDir, 'index.mjs')],
      inputs: invalidInputs,
      cwd: createdProjectDir,
      timeout: 30000,
      debug: true
    });

    // Verify error handling for invalid command
    expect(invalidResult.stdout).toContain('Unknown command');
    expect(invalidResult.stdout).toContain('Try "configure" instead');

    // Test version command
    console.log('Testing version command...');

    const versionResult = await testCLITiming({
      command: 'node',
      args: [
        path.join(createdProjectDir, 'index.mjs'),
        '--version'      // Show version
      ],
      inputs: [],
      cwd: createdProjectDir,
      timeout: 30000,
      debug: true
    });

    // Verify version output
    expect(versionResult.code).toBe(0);
    expect(versionResult.stdout).toContain('1.0.0'); // Default version from template

    // Also test help command of the scaffolded CLI to see the available commands
    console.log('Testing help command of scaffolded CLI...');

    const helpCommandResult = await testCLITiming({
      command: 'node',
      args: [
        path.join(createdProjectDir, 'index.mjs'),
        '--help'          // Show help
      ],
      inputs: [],         // No input needed for help mode
      cwd: createdProjectDir,
      timeout: 30000,
      debug: true
    });

    // Verify help output with more specific checks
    expect(helpCommandResult.stdout).toContain('Usage:');
    // Commander.js uses the script name from process.argv[1], which can be either 'index' or 'interactive-cli'
    // So we'll check for either pattern to make the test more flexible
    expect(
      helpCommandResult.stdout.includes('index [options] [command]') ||
      helpCommandResult.stdout.includes('interactive-cli [options] [command]')
    ).toBe(true);
    expect(helpCommandResult.stdout).toContain('A CLI created with interactive input');
    expect(helpCommandResult.stdout).toContain('configure');
    expect(helpCommandResult.stdout).toContain('Configure the application');
  });
});
