import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import { fileURLToPath } from 'url';
import {exec, execSync, spawn} from 'child_process';
import { promisify } from 'util';
import { render } from '@inquirer/testing';

const execPromise = promisify(exec);

// Helper function to simulate keystrokes in a test
async function simulateTyping(session, text, options = {}) {
  const { clearFirst = false, clearLength = 0, delay = 5 } = options;

  // Optionally clear existing text
  if (clearFirst) {
    for (let i = 0; i < clearLength; i++) {
      session.events.keypress('backspace');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Type each character with a small delay
  for (const char of text) {
    session.events.type(char);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Verify the screen shows the typed text
  expect(session.getScreen()).toContain(text);
}

// Helper function to run the CLI generator
async function runGenerator(targetDir, options = {}) {
  const binPath = path.join(__dirname, '..', 'bin', 'index.js');

  // Default options
  const defaultOptions = {
    projectName: 'test-cli-app',
    description: 'A test CLI application',
    author: 'Test Author',
    skipGit: true,
    skipInstall: true
  };

  // Merge options
  const runOptions = { ...defaultOptions, ...options };

  // Build command
  let command = `node ${binPath} ${runOptions.projectName}`;
  if (runOptions.skipGit) command += ' --no-git';
  if (runOptions.skipInstall) command += ' --no-install';
  if (runOptions.yes) command += ' --yes';

  // Run command
  return execPromise(command, { cwd: targetDir, timeout: 10000 });
}

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('CLI Template Generator End-to-End Tests', () => {
  let tempDir;

  beforeEach(async () => {
    // Create temp directory
    tempDir = tmp.dirSync({ unsafeCleanup: true }).name;
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir) {
      fs.removeSync(tempDir);
    }
  });

  test('Verify scaffold/index.mjs.template structure', async () => {
    // Read template file
    const templatePath = path.join(rootDir, 'scaffold', 'index.mjs.template');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Verify template has required components
    expect(templateContent).toMatch(/^#!\/usr\/bin\/env node/);
    expect(templateContent).toContain('export function registerCommands');
    expect(templateContent).toContain('export async function main');
    expect(templateContent).toContain('export async function showMainMenu');
    expect(templateContent).toContain('export async function helloWorld');

    // Verify structure includes the core elements
    expect(templateContent.includes('command') && templateContent.includes('configure')).toBe(true);
    expect(templateContent).toContain('if (process.argv.length <= 2)');
    expect(templateContent).toContain('const action = await input');
  });

  test('Verify package.json has required dependencies', async () => {
    const packageJsonPath = path.join(rootDir, 'scaffold', 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);

    // Verify it has the right dependencies
    expect(packageJson.dependencies).toHaveProperty('@inquirer/prompts');
    expect(packageJson.dependencies).toHaveProperty('commander');
    expect(packageJson.dependencies).toHaveProperty('chalk');

    // Verify bin structure
    expect(packageJson.bin).toBeDefined();

    // Verify scripts
    expect(packageJson.scripts).toHaveProperty('start');
    expect(packageJson.scripts).toHaveProperty('test');
  });

  test('Generate and verify a complete CLI project', async () => {

    // Mock environment variables to simulate non-interactive mode
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    try {
      // Create a subdirectory for our test app
      const appDir = path.join(tempDir, 'test-app-dir');
      await fs.ensureDir(appDir);

      // Run generator with --yes flag to skip prompts
      await runGenerator(appDir, {
        projectName: 'test-cli',
        yes: true,
        skipGit: true,
        skipInstall: true
      });

      // Check that the project was created
      const projectDir = path.join(appDir, 'test-cli');
      expect(fs.existsSync(projectDir)).toBe(true);

      // Check key files
      const files = [
        'index.mjs',
        'package.json',
        'eslint.config.mjs',
        'jest.config.mjs',
        '.gitignore'
      ];

      for (const file of files) {
        expect(fs.existsSync(path.join(projectDir, file))).toBe(true);
      }

      // Verify package.json
      const packageJson = await fs.readJson(path.join(projectDir, 'package.json'));
      expect(packageJson.name).toBe('test-cli');
      expect(packageJson.bin).toHaveProperty('test-cli');

      // Check that index.mjs is executable
      const stats = await fs.stat(path.join(projectDir, 'index.mjs'));
      const isExecutable = !!(stats.mode & fs.constants.S_IXUSR);
      expect(isExecutable).toBe(true);

      // Verify template values were substituted
      const indexContent = await fs.readFile(path.join(projectDir, 'index.mjs'), 'utf8');
      expect(indexContent).not.toContain('{{title}}');
      expect(indexContent).not.toContain('{{description}}');
    } finally {
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    }
  });

});
