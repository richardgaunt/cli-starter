#!/usr/bin/env node

import { program } from 'commander';
import { hello } from '../src/index.js';

program
  .version('1.0.0')
  .description('CLI application')
  .option('-n, --name <name>', 'your name')
  .action((options) => {
    hello(options.name);
  });

program.parse();