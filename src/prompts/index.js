import { input, select } from '@inquirer/prompts';
import { getGitUser } from '../utils/git.js';

export async function getProjectInfo(name, options) {
  // Get git user info for defaults
  const gitUser = await getGitUser();
  
  // Use defaults if --yes flag is provided
  if (options.yes) {
    return {
      name: name || 'cli-app',
      description: '',
      author: gitUser.name,
      license: 'MIT',
      email: gitUser.email
    };
  }
  
  // Prompt for project name if not provided
  const projectName = name || await input({
    message: 'Project name:',
    validate: (value) => /^[a-zA-Z0-9-_]+$/.test(value) || 'Invalid project name'
  });
  
  // Prompt for additional info
  const description = await input({
    message: 'Project description:'
  });
  
  const author = await input({
    message: 'Author:',
    default: gitUser.name
  });
  
  const license = await select({
    message: 'License:',
    choices: [
      { value: 'MIT', name: 'MIT' },
      { value: 'ISC', name: 'ISC' },
      { value: 'Apache-2.0', name: 'Apache 2.0' },
      { value: 'GPL-3.0', name: 'GPL 3.0' }
    ],
    default: 'MIT'
  });
  
  return {
    name: projectName,
    description,
    author,
    license,
    email: gitUser.email
  };
}