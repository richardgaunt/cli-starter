import { jest } from '@jest/globals';
import { hello } from '../src/index.mjs';

describe('hello', () => {
  let consoleLogSpy;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('should greet with default name', () => {
    hello();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Hello, world!'));
  });

  test('should greet with provided name', () => {
    hello('Jane');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Hello, Jane!'));
  });
});
