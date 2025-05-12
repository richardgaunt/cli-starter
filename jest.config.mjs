export default {
  testEnvironment: 'node',
  testMatch: ['**/test/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['*.js', '!jest.setup.js', '!jest.config.mjs', '!eslint.config.mjs'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.(js|mjs)$': '$1'
  },
  transform: {},
  transformIgnorePatterns: ['/node_modules/'],
  testTimeout: 300000, // 5 minutes
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  bail: false,
  injectGlobals: true,
};