// @ts-check
import { execSync } from 'child_process';

// Import directly since we're mocking the actual execSync in each test
import { getRecentCommits, checkGitRepository, checkGhCli, getDefaultBranch, getRemoteBranches } from '../index';

describe('Git utility functions', () => {
  // Mock the execSync function for each test
  let originalExecSync;
  
  beforeEach(() => {
    // Save the original execSync
    originalExecSync = execSync;
    
    // Replace execSync with a mock function
    global.execSync = jest.fn();
  });
  
  afterEach(() => {
    // Restore the original execSync
    global.execSync = originalExecSync;
  });

  describe('getRecentCommits', () => {
    it('should parse git log output correctly', () => {
      // Mock the git log output
      execSync.mockReturnValueOnce(Buffer.from(
        'abc123|||Fix navigation bar|||Fixed styling issues in the navigation bar\n' +
        'def456|||Add user authentication|||Implemented JWT authentication\n' +
        'ghi789|||Update README|||Updated installation instructions'
      ));

      const commits = getRecentCommits(3);

      // Verify the command that was executed
      expect(execSync).toHaveBeenCalledWith('git log -3 --pretty=format:%h|||%s|||%b');

      // Verify the parsed output
      expect(commits).toEqual([
        {
          hash: 'abc123',
          subject: 'Fix navigation bar',
          body: 'Fixed styling issues in the navigation bar'
        },
        {
          hash: 'def456',
          subject: 'Add user authentication',
          body: 'Implemented JWT authentication'
        },
        {
          hash: 'ghi789',
          subject: 'Update README',
          body: 'Updated installation instructions'
        }
      ]);
    });

    it('should handle commits with empty bodies', () => {
      execSync.mockReturnValueOnce(Buffer.from(
        'abc123|||Fix bug|||\n' +
        'def456|||Add feature|||This is a description'
      ));

      const commits = getRecentCommits(2);

      expect(commits).toEqual([
        {
          hash: 'abc123',
          subject: 'Fix bug',
          body: ''
        },
        {
          hash: 'def456',
          subject: 'Add feature',
          body: 'This is a description'
        }
      ]);
    });

    it('should return empty array on error', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });

      const commits = getRecentCommits();

      expect(commits).toEqual([]);
    });
  });

  describe('checkGitRepository', () => {
    it('should return true when in a git repo', () => {
      execSync.mockReturnValueOnce(Buffer.from('true'));

      const result = checkGitRepository();

      expect(execSync).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
      expect(result).toBe(true);
    });

    it('should return false when not in a git repo', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('not a git repository');
      });

      const result = checkGitRepository();

      expect(result).toBe(false);
    });
  });

  describe('checkGhCli', () => {
    it('should return true when gh is installed', () => {
      execSync.mockReturnValueOnce(Buffer.from('gh version 2.0.0'));

      const result = checkGhCli();

      expect(execSync).toHaveBeenCalledWith('gh --version', { stdio: 'ignore' });
      expect(result).toBe(true);
    });

    it('should return false when gh is not installed', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('command not found: gh');
      });

      const result = checkGhCli();

      expect(result).toBe(false);
    });
  });

  describe('getDefaultBranch', () => {
    it('should return the default branch from remote', () => {
      // Mock git remote command
      execSync.mockReturnValueOnce(Buffer.from('origin'));
      
      // Mock the remote show command that includes HEAD branch
      execSync.mockReturnValueOnce(Buffer.from('  HEAD branch: main'));
      
      const result = getDefaultBranch();
      
      expect(execSync).toHaveBeenCalledWith('git remote');
      expect(execSync).toHaveBeenCalledWith('git remote show origin | grep "HEAD branch"');
      expect(result).toBe('main');
    });

    it('should fall back to main if remote check fails', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });
      
      const result = getDefaultBranch();
      
      expect(result).toBe('main');
    });
  });

  describe('getRemoteBranches', () => {
    it('should parse remote branches correctly', () => {
      execSync.mockReturnValueOnce(Buffer.from(
        '  origin/main\n' +
        '  origin/develop\n' +
        '  origin/feature/test'
      ));
      
      const branches = getRemoteBranches();
      
      expect(execSync).toHaveBeenCalledWith('git branch -r | grep -v HEAD');
      expect(branches).toEqual(['main', 'develop', 'feature/test']);
    });

    it('should return empty array on error', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('git command failed');
      });
      
      const branches = getRemoteBranches();
      
      expect(branches).toEqual([]);
    });
  });
});
