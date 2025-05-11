import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

const execPromise = promisify(exec);

export async function installDependencies(targetDir) {
  try {
    logger.info('Installing dependencies... This might take a few minutes.');
    await execPromise('npm install', { cwd: targetDir });
    logger.success('Dependencies installed successfully');
    return true;
  } catch (error) {
    logger.error('Failed to install dependencies', error);
    return false;
  }
}

/**
 * Updates the package.json file with project information
 *
 * @param {string} targetDir - The directory containing the package.json file
 * @param {Object} projectInfo - The project information from user input
 * @param {string} projectInfo.name - The project name
 * @param {string} projectInfo.description - The project description
 * @param {string} projectInfo.author - The project author
 * @param {string} projectInfo.license - The project license
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function updatePackageJson(targetDir, projectInfo) {
  try {
    const packageJsonPath = path.join(targetDir, 'package.json');

    // Read the existing package.json
    const packageJson = await fs.readJson(packageJsonPath);

    // Update package.json with project info
    packageJson.name = projectInfo.name;
    packageJson.description = projectInfo.description;
    packageJson.author = projectInfo.author;
    packageJson.license = projectInfo.license;

    // Update bin field to use the project name
    packageJson.bin = {
      [projectInfo.name]: "index.mjs"
    };

    // Write back to file
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    logger.success('Updated package.json with project information');
    return true;
  } catch (error) {
    logger.error('Failed to update package.json', error);
    return false;
  }
}