import chalk from 'chalk';

export const logger = {
  info: (message) => {
    console.log(chalk.blue('info') + ': ' + message);
  },
  success: (message) => {
    console.log(chalk.green('success') + ': ' + message);
  },
  warning: (message) => {
    console.log(chalk.yellow('warning') + ': ' + message);
  },
  error: (message, error) => {
    console.error(chalk.red('error') + ': ' + message);
    if (error) {
      console.error(error);
    }
  }
};