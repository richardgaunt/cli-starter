import { exec } from 'child_process';
import { promisify } from 'util';
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