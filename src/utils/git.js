import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execPromise = promisify(exec);

export async function getGitUser() {
  try {
    const { stdout: nameStdout } = await execPromise('git config --get user.name');
    const { stdout: emailStdout } = await execPromise('git config --get user.email');
    
    return {
      name: nameStdout.trim() || '',
      email: emailStdout.trim() || ''
    };
  } catch (error) {
    logger.warning('Could not get git user info');
    return { name: '', email: '' };
  }
}

export async function initGit(targetDir) {
  try {
    await execPromise('git init', { cwd: targetDir });
    logger.success('Initialized git repository');
    return true;
  } catch (error) {
    logger.warning('Failed to initialize git repository');
    return false;
  }
}