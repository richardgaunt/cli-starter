import { input, select } from '@inquirer/prompts';
import { getGitUser } from '../utils/git.mjs';

export async function getProjectInfo(name, options) {
  // Get git user info for defaults
  const gitUser = await getGitUser();

  // Use defaults if --yes flag is provided
  if (options.yes) {
    const directoryName = name || 'cli-app';
    return {
      name: directoryName, // package/directory name
      title: directoryName.charAt(0).toUpperCase() + directoryName.slice(1).replace(/-/g, ' '), // Human readable title
      description: '',
      author: gitUser.name,
      license: 'MIT',
      email: gitUser.email
    };
  }

  // Prompt for project directory/package name if not provided
  const packageName = name || await input({
    message: 'Package/directory name:',
    validate: (value) => /^[a-zA-Z0-9-_]+$/.test(value) || 'Invalid package name (use lowercase with hyphens)'
  });

  // Default title is the package name with first letter capitalized and hyphens replaced with spaces
  const defaultTitle = packageName.charAt(0).toUpperCase() + packageName.slice(1).replace(/-/g, ' ');

  // Prompt for human-readable title
  const title = await input({
    message: 'Human-readable title:',
    default: defaultTitle
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
    name: packageName, // package/directory name
    title, // human readable title
    description,
    author,
    license,
    email: gitUser.email
  };
}
