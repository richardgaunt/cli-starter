# Publishing to GitHub Packages

This document provides instructions for publishing this package to GitHub Packages.

## Prerequisites

1. GitHub account with permissions to publish to the repository
2. Personal access token with the appropriate scopes (write:packages, read:packages) if publishing manually

## Automated Publishing with Tags

This repository is configured to automatically publish to GitHub Packages whenever a new Git tag is pushed. The process is handled by the GitHub Actions workflow at `.github/workflows/publish-on-tag.yml`.

### Publishing Process

1. **Update CHANGELOG.md**: Document your changes in the CHANGELOG.md file

2. **Bump Version**: Use one of the following commands to update the version number:
   ```bash
   # For bug fixes
   npm run version:patch   # e.g., 1.0.0 -> 1.0.1

   # For new features
   npm run version:minor   # e.g., 1.0.0 -> 1.1.0

   # For breaking changes
   npm run version:major   # e.g., 1.0.0 -> 2.0.0
   ```
   This will:
   - Update the version in package.json
   - Create a Git tag for the new version
   - Create a version commit

3. **Push Tag**: Push the newly created tag to trigger the workflow
   ```bash
   git push origin v1.0.0  # Replace with your actual version
   ```

4. **Monitor Workflow**: Check the GitHub Actions tab to monitor the publishing process

5. **Verify Package**: Once published, verify the package is available on GitHub Packages

## CI/CD Workflows

### 1. Testing Workflow

The repository includes a continuous integration workflow that runs on all pushes to main and pull requests:

```yaml
name: Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm ci
    - run: npm run lint
    - run: npm test
```

### 2. Publishing Workflow

The tag-based publishing workflow is defined in `.github/workflows/publish-on-tag.yml`:

```yaml
name: Publish Package on Tag

on:
  push:
    tags:
      - 'v*' # This will trigger on any tag that starts with 'v'

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@richardgaunt'

      # Additional steps...
```

## Using the Published Package

After publishing, you can install the package with:

```bash
npm install -g @richardgaunt/cli-maker
```

Or use it directly with npx:

```bash
npx @richardgaunt/cli-maker my-cli-app
```

## Local Testing Before Publishing

Before publishing, you can test the package locally:

1. Link the package locally:
   ```bash
   npm link
   ```

2. Create a test CLI app:
   ```bash
   cli-maker test-app
   ```

3. Verify the generated project works as expected

## Manual Publishing

If you prefer to publish manually:

1. Set up authentication for GitHub Packages:
   ```bash
   echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" > ~/.npmrc
   echo "@richardgaunt:registry=https://npm.pkg.github.com" >> ~/.npmrc
   ```

2. Publish the package:
   ```bash
   npm publish
   ```
