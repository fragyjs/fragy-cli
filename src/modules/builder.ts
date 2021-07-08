/* eslint-disable no-console */
import commander from 'commander';
import child_process from 'child_process';
import portfinder from 'portfinder';
import chalk from 'chalk';
import path from 'path';
import fsp from 'fs/promises';
import fs from 'fs';
import { Application } from '../app';
import createServer from '../utils/localServer';

const buildSite = (app: Application) => {
  const userConfigPath = path.resolve(app.workDir, './fragy.config.js');
  if (!fs.existsSync(userConfigPath)) {
    app.logger.error('Cannot find fragy.config.js under current directory.');
    return;
  }
  const moduleDirPath = path.resolve(app.workDir, './node_modules/fragy');
  if (!fs.existsSync(moduleDirPath)) {
    app.logger.error('Cannot find fragy in node_modules, please check your project.');
  }
  // run build command
  child_process.execSync('npm run build', { stdio: 'inherit', cwd: moduleDirPath });
};

const mount = (app: Application, program: commander.Command): void => {
  program
    .command('build')
    .description('Build the fragy site')
    .action(() => {
      buildSite(app);
    });
  program
    .command('serve')
    .description('Create local server to preview your site')
    .option('-s, --skip-build', 'Skip building, create server directly')
    .action(async (options: commander.Command) => {
      const distPath = path.resolve(app.workDir, './dist');
      if (!fs.existsSync(distPath) || !options.skipBuild) {
        // remove existed dist files first
        if (fs.existsSync(distPath)) {
          const stat = await fsp.stat(distPath);
          if (stat.isDirectory()) {
            await fsp.rm(distPath, { recursive: true, force: true });
          }
        }
        app.logger.debug('Starting to build the site...');
        buildSite(app);
      }
      // start server
      const server = createServer(distPath);
      const port = await portfinder.getPortPromise({
        port: 8080,
        stopPort: 8090,
      });
      server.listen(port);
      console.clear();
      console.log(
        `\n\n  ${chalk.green('Fragy local preview server running at:')}\n\n    ${chalk.blue(
          `- http://localhost:${port}`,
        )}\n\n  ${chalk.yellow('Note this server is only for preview.')}\n\n`,
      );
    });
};

export default mount;
