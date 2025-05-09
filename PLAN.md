● NPM Create Starter App - Architectural Plan

1. Project Structure

cli-template/
├── bin/
│   └── index.js        # CLI entry point
├── src/
│   ├── commands/       # Command implementations
│   │   └── create.js   # Main creation logic
│   ├── prompts/        # User interaction prompts
│   │   └── index.js    # Centralized prompt definitions
│   ├── utils/          # Helper functions
│   │   ├── logger.js   # Logging utilities
│   │   ├── fs.js       # File operations
│   │   └── git.js      # Git operations
│   └── index.js        # Main module exports
├── scaffold/           # Templates directory
│   └── cli/            # CLI application template
│       ├── bin/        # Executable scripts
│       ├── src/        # Source code
│       ├── gitignore   # Git ignore template
│       ├── package.json.template  # Package.json template
│       └── README.md.template     # README template
├── package.json
└── README.md

2. Technical Implementation

Command Line Interface

- Entry Point: Use bin/index.js with shebang (#!/usr/bin/env node) to make it executable
- Command Processing: Use commander or yargs to parse CLI arguments
- Global Installation: Configure package.json with bin field to make globally installable

// bin/index.js example
#!/usr/bin/env node
const { program } = require('commander');
const pkg = require('../package.json');
const createCommand = require('../src/commands/create');

program
.version(pkg.version)
.description('Create a new CLI application')
.argument('[name]', 'Project name')
.option('-y, --yes', 'Skip all prompts and use defaults')
.option('--no-git', 'Skip git initialization')
.option('--no-install', 'Skip dependency installation')
.action(createCommand);

program.parse();

User Interaction

- Prompt Handling: Use @inquirer/prompts for interactive prompts
- Input Validation: Validate project names, paths, and options
- Non-Interactive Mode: Support --yes flag for CI/automated usage
- Default Values: Pull default values from git config where applicable

// src/prompts/index.js example
const { input, select } = require('@inquirer/prompts');
const { getGitUser } = require('../utils/git');

async function getProjectInfo(name, options) {
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
        { name: 'MIT', value: 'MIT' },
        { name: 'ISC', value: 'ISC' },
        { name: 'Apache 2.0', value: 'Apache-2.0' },
        { name: 'GPL 3.0', value: 'GPL-3.0' }
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

module.exports = { getProjectInfo };

Template System

- Template Storage: Store templates in scaffold/cli directory
- Variable Substitution: Use a template engine like handlebars for package.json and README
- Custom Processing: Support for special files like package.json to update with user inputs

// src/utils/fs.js example
const fs = require('fs-extra');
const path = require('path');
const handlebars = require('handlebars');

async function copyTemplate(templatePath, targetPath, variables) {
await fs.ensureDir(targetPath);

    const files = await fs.readdir(templatePath, { withFileTypes: true });

    for (const file of files) {
      const sourcePath = path.join(templatePath, file.name);
      const targetFileName = file.name.replace('.template', '');
      const destPath = path.join(targetPath, targetFileName);

      if (file.isDirectory()) {
        await copyTemplate(sourcePath, destPath, variables);
      } else if (file.name.endsWith('.template')) {
        // Process template files with handlebars
        const content = await fs.readFile(sourcePath, 'utf8');
        const processed = handlebars.compile(content)(variables);
        await fs.writeFile(destPath, processed);
      } else if (file.name === 'gitignore') {
        // Special case for gitignore to avoid npm issues
        await fs.writeFile(path.join(targetPath, '.gitignore'),
          await fs.readFile(sourcePath, 'utf8'));
      } else {
        // Copy file as-is
        await fs.copy(sourcePath, destPath);
      }
    }
}

module.exports = { copyTemplate };

Project Creation Flow

1. Parse command line arguments
2. Prompt for project name, description, author, and license
3. Validate target directory
4. Copy and process template files
5. Customize package.json with user input
6. Initialize git repository (if enabled)
7. Install dependencies (if enabled)
8. Display success message with next steps

// src/commands/create.js example
const path = require('path');
const fs = require('fs-extra');
const { getProjectInfo } = require('../prompts');
const { copyTemplate } = require('../utils/fs');
const { initGit } = require('../utils/git');
const { installDependencies } = require('../utils/npm');
const { logger } = require('../utils/logger');

async function createCommand(name, options) {
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

module.exports = createCommand;

3. User Interaction Flow

1. Initial Command: User runs npm create cli-template my-app
2. Interactive Prompts:
   - Project name (if not provided as argument)
   - Project description
   - Author name (default from git config)
   - License (default is MIT)
3. Processing: System processes templates with the provided information
4. Output: Complete CLI project structure with customized package.json and README

4. Template File Examples

package.json.template
```
{
"name": "{{name}}",
"version": "1.0.0",
"description": "{{description}}",
"main": "src/index.js",
"bin": {
"{{name}}": "./bin/index.js"
},
"scripts": {
"start": "node ./bin/index.js",
"test": "jest"
},
"keywords": ["cli"],
"author": "{{author}} <{{email}}>",
"license": "{{license}}",
"dependencies": {
"commander": "^9.0.0",
"@inquirer/prompts": "^3.0.0",
"chalk": "^4.1.2"
},
"devDependencies": {
"jest": "^27.5.1"
}
}
```
README.md.template

# {{name}}

{{description}}

## Installation

  ```bash
  npm install -g {{name}}

  Usage

  {{name}} [options]

  License

  {{license}} © {{author}}
```
  ## 5. Dependencies

  - **Core Dependencies**:
    - `commander` or `yargs`: Command-line argument parsing
    - `@inquirer/prompts`: Interactive user prompts (modular version of inquirer)
    - `fs-extra`: Enhanced file system operations
    - `handlebars`: Template processing
    - `chalk`: Colorful terminal output
    - `ora`: Elegant terminal spinners

  - **Dev Dependencies**:
    - `jest`: Testing framework
    - `eslint`: Code linting
    - `prettier`: Code formatting

  ## 6. Key Differences with @inquirer/prompts

  The `@inquirer/prompts` package is a more modular and lightweight alternative to the traditional `inquirer` package. Key differences include:

  1. **Individual imports**: Import only the prompt types you need
     ```javascript
     const { input, select, confirm } = require('@inquirer/prompts');

  2. Async/await friendly: Each prompt returns a Promise directly
  const name = await input({ message: 'What is your name?' });
  3. Simpler API: More straightforward API with less nesting
  // Old inquirer
  const answers = await inquirer.prompt([
    { type: 'input', name: 'name', message: 'Name?' }
  ]);
  const name = answers.name;

  // @inquirer/prompts
  const name = await input({ message: 'Name?' });
  4. Smaller bundle size: Only imports what you need, reducing package size
  5. Better TypeScript support: Improved type definitions

  7. Future Enhancements

  - Support for different command line argument parsing libraries
  - Custom prompts for additional CLI functionality
  - Testing templates
  - CI/CD integration examples
  - Command registration system for easy extension

  This architecture provides a simple foundation for creating CLI applications with the basic configuration needed to get started quickly. The focus is on creating a ready-to-use CLI app template with proper package.json configuration based on user input.
