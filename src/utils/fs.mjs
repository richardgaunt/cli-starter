import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from './logger.mjs';

export async function copyTemplate(templatePath, targetPath, variables) {
  try {
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
        const processed = Handlebars.compile(content)(variables);
        await fs.writeFile(destPath, processed);

        // Make the file executable if it's our entry point script
        if (targetFileName === 'index.mjs') {
          await fs.chmod(destPath, 0o755);
        }

        logger.info(`Created ${targetFileName}`);
      } else if (file.name === 'gitignore') {
        // Special case for gitignore to avoid npm issues
        await fs.writeFile(path.join(targetPath, '.gitignore'),
          await fs.readFile(sourcePath, 'utf8'));
        logger.info('Created .gitignore');
      } else {
        // Copy file as-is
        await fs.copy(sourcePath, destPath);
        logger.info(`Copied ${file.name}`);
      }
    }
    return true;
  } catch (error) {
    logger.error('Failed to copy template', error);
    return false;
  }
}
