# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands
- Run CLI: `npm start`
- Run tests: `npm test`
- Run specific test: `npm test -- -t "test name"`
- Lint code: `npm run lint`
- Link package locally: `npm link` (for testing CLI locally)

## Project Architecture

This project is a CLI template generator that scaffolds new command-line applications. The key architecture components are:

### Core Components

1. **Command Processing**
   - `bin/index.js`: CLI entry point using Commander.js for command parsing
   - `src/commands/create.js`: Main command implementation for creating new projects

2. **User Interaction**
   - `src/prompts/index.js`: Handles interactive user prompts using @inquirer/prompts
   - Collects project name, description, author, and license information

3. **Template System**
   - `scaffold/cli/`: Contains template files for generated projects
   - Uses Handlebars for template variable substitution
   - Templates include package.json, README, and configuration files

4. **Utility Modules**
   - `src/utils/fs.js`: File system operations for template processing
   - `src/utils/git.js`: Git repository operations
   - `src/utils/npm.js`: NPM package operations
   - `src/utils/logger.js`: Console output formatting

### Project Creation Flow

1. Parse command line arguments
2. Prompt for project configuration
3. Copy and process template files
4. Customize files with user input
5. Initialize git repository (if enabled)
6. Install dependencies (if enabled)
7. Display success message

### Generated Project Structure

The tool generates a new CLI application with:
- Entry point in bin/index.mjs
- Main code in src/index.mjs
- Jest test setup
- ESLint configuration
- Git initialization