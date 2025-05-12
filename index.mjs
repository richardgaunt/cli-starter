
import { Command } from 'commander';
import { createCommand } from './src/commands/create.mjs';

const program = new Command();

program
  .version('1.0.0')
  .description('Create a new CLI application')
  .argument('[name]', 'Project name')
  .option('-y, --yes', 'Skip all prompts and use defaults')
  .option('--no-git', 'Skip git initialization')
  .option('--no-install', 'Skip dependency installation')
  .action(createCommand);

program.parse();
