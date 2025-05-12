# 🚀 CLI Maker

A starter kit generator for CLI applications. This tool helps you quickly scaffold a new command-line interface application with all the necessary configurations.

[![Tests](https://github.com/richardgaunt/cli-maker/actions/workflows/tests.yml/badge.svg)](https://github.com/richardgaunt/cli-maker/actions/workflows/tests.yml)


## ✨ Features

- 📂 Generates a complete CLI application structure
- 🧪 Sets up testing with Jest
- 🔍 Configures ESLint for code quality
- 🔄 Initializes Git repository
- 🛠️ Sets up Command parsing with Commander.js
- 💬 User input handling with Inquirer

## 📋 Installation

### From GitHub Packages

```bash
# Install globally from GitHub Packages
npm install -g @richardgaunt/cli-maker

# Or use directly with npx
npx @richardgaunt/cli-maker my-cli-app

# For GitHub Packages, you'll need to authenticate first:
# 1. Create a personal access token with 'read:packages' scope
# 2. Create or update ~/.npmrc with:
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
@richardgaunt:registry=https://npm.pkg.github.com
```

### From the Repository

```bash
# Clone the repository
git clone https://github.com/richardgaunt/cli-maker.git
cd cli-maker

# Install dependencies
npm install

# Link the package locally for testing
npm link
```

## 🚀 Usage

```bash
# Create a new CLI application with interactive prompts
cli-maker my-cli-app

# Skip prompts and use defaults
cli-maker my-cli-app --yes

# Skip git initialization
cli-maker my-cli-app --no-git

# Skip dependency installation
cli-maker my-cli-app --no-install
```

## ⚙️ CLI Options

- `[name]` - Project directory/package name (optional)
- `-y, --yes` - Skip all prompts and use defaults
- `--no-git` - Skip git initialization
- `--no-install` - Skip dependency installation

## 💬 Configuration Prompts

When creating a new CLI application, you'll be asked for:

1. **Package/directory name**: The npm package name and directory name (lowercase with hyphens)
2. **Human-readable title**: A prettier title for display in README and CLI output
3. **Project description**: A brief description of what your CLI does
4. **Author**: Your name (defaults to Git config)
5. **License**: The license to use (MIT, ISC, Apache-2.0, GPL-3.0)

## 📂 Generated Project Structure

```
my-cli-app/
├── bin/
│   └── index.mjs        # CLI entry point
├── src/
│   ├── index.mjs        # Main module exports
│   └── index.test.js    # Tests for main module
├── tests/
│   └── index.test.mjs   # Additional tests
├── .gitignore
├── eslint.config.mjs
├── jest.config.mjs
├── package.json
└── README.md
```

## 🧪 Testing Strategy

This project uses a sophisticated approach to testing interactive CLI applications:

### Timing-Based Testing

The core of our testing framework is a timing-based approach that reliably interacts with CLI prompts:

```javascript
function testCLITiming({ command, args, inputs, cwd, timeout, debug }) {
  // Spawn the process
  // Send inputs with fixed timing
  // Collect and verify output
}
```

Key advantages:
- More reliable than prompt detection methods
- Works with complex, nested prompts
- Simpler to maintain and extend
- Handles ANSI color codes and formatting

### Test Suites

We've organized tests into different suites to cover all aspects of CLI functionality:

- **Basic Functionality**: Tests that the CLI generator works correctly
- **Error Handling**: Verifies the CLI responds gracefully to invalid inputs
- **Scaffolded Features**: Tests the CLI applications created by the generator
- **End-to-End**: Tests the full workflow from generation to usage

### Running Tests

Tests can be run individually or all at once:

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:timing      # Run timing-based CLI tests
npm run test:errors      # Run error handling tests
npm run test:features    # Run scaffolded CLI feature tests
npm run test:all         # Run all test suites
```

### Writing New Tests

To add new tests for CLI functionality:

1. Use the `testCLITiming` function in your test files
2. Define the command to run and input sequence
3. Verify the output matches expectations

Example:
```javascript
test('Create CLI application with custom inputs', async () => {
  const inputs = [
    'my-app',           // Project name
    'My Application',   // Title
    'A test app',       // Description
    'Test Author',      // Author
    '',                 // License (default)
  ];

  const result = await testCLITiming({
    command: 'node',
    args: [path.join(rootDir, 'bin/index.js')],
    inputs,
    cwd: tempDir,
    timeout: 30000,
    debug: false
  });

  expect(result.code).toBe(0);
  expect(result.stdout).toContain('created successfully');
});
```

## 🛠️ Development

```bash
# Clone this repository
git clone <repository-url>
cd cli-maker

# Install dependencies
npm install

# Link the package locally for testing
npm link

# Run the CLI
cli-maker test-app

# Run tests
npm test

# Run specific test suites
npm run test:timing
npm run test:errors
npm run test:features
npm run test:all

# Run linting
npm run lint
```

## 📄 License

MIT © Richard Gaunt
