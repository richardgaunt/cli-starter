# Add GitHub Action for Tag-Based Package Publishing

## Summary

This PR adds a GitHub Action workflow that automatically publishes the package to GitHub Packages whenever a new tag is pushed. This streamlines the release process by eliminating manual publishing steps and ensures consistency in our package deployment pipeline.

## Changes

- Add GitHub Action workflow to publish package when a new tag is pushed (`publish-on-tag.yml`)
- Add basic test workflow to run tests on all PRs and pushes to main branch (`test.yml`)
- Create CHANGELOG.md for tracking releases
- Update package.json with version management scripts and pre-publish hooks
- Update documentation on the publishing process

## Testing Done

- Validated workflow file syntax
- Confirmed GitHub token permissions are set correctly
- Tested version bump scripts locally
- Verified proper tag detection in workflow

## Documentation

This PR includes comprehensive documentation updates:

- PUBLISHING.md updated with tag-based workflow instructions
- Added version bump commands to simplify the release process
- Added CHANGELOG.md to track release history

## Checklist

- [x] GitHub Action workflow files are syntactically valid
- [x] Workflow has proper permissions to publish packages
- [x] Documentation is clear and comprehensive
- [x] Added version bump scripts for easy versioning
- [x] Set up proper pre-publish hooks to ensure quality

## How to Test

1. After merging, create a new version with:
   ```bash
   npm run version:patch
   git push origin main --tags
   ```

2. Check that the workflow runs automatically and publishes the package to GitHub Packages

3. Verify the package can be installed with:
   ```bash
   npm install -g @richardgaunt/cli-maker
   ```
