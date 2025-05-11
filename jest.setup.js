// Global Jest setup
import { jest } from '@jest/globals';

// Set a longer timeout for end-to-end tests
jest.setTimeout(30000);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});
