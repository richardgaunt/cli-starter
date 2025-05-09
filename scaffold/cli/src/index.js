import chalk from 'chalk';

export function hello(name = 'world') {
  console.log(chalk.blue(`Hello, ${name}!`));
  console.log(chalk.green('Welcome to your new CLI application.'));
  
  if (!name || name === 'world') {
    console.log(chalk.yellow('Tip: Try running with --name option to personalize the greeting.'));
  }
}