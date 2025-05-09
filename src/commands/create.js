import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { getProjectInfo } from '../prompts/index.js';
import { copyTemplate } from '../utils/fs.js';
import { initGit } from '../utils/git.js';
import { installDependencies } from '../utils/npm.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createCommand(name, options) {
  try {
    // Get project information
    const projectInfo = await getProjectInfo(name, options);
    const targetDir = path.resolve(process.cwd(), projectInfo.name);
    
    // Check if directory exists
    if (fs.existsSync(targetDir)) {
      if (fs.readdirSync(targetDir).length > 0) {
        logger.error(`Directory ${projectInfo.name} already exists and is not empty.`);
        process.exit(1);
      }
    }
    
    // Create project directory
    await fs.ensureDir(targetDir);
    
    // Copy CLI template
    const templatePath = path.resolve(__dirname, '../../scaffold/cli');
    await copyTemplate(templatePath, targetDir, projectInfo);
    
    // Initialize git repository
    if (options.git !== false) {
      await initGit(targetDir);
    }
    
    // Install dependencies
    if (options.install !== false) {
      await installDependencies(targetDir);
    }
    
    // Display success message
    logger.success(`
CLI application ${projectInfo.name} created successfully!

Next steps:
$ cd ${projectInfo.name}
$ npm link    # To make the CLI available globally
$ npm start   # To run the CLI
`);
  } catch (error) {
    logger.error('Failed to create project:', error);
    process.exit(1);
  }
}