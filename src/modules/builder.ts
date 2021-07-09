/* eslint-disable no-console */
import commander from 'commander';
import childProcess from 'child_process';
import portfinder from 'portfinder';
import chalk from 'chalk';
import path from 'path';
import open from 'open';
import fsp from 'fs/promises';
import fs from 'fs';
import { Application } from '../app';
import createServer from '../utils/localServer';
import { copyDirectory } from '../utils/fs';

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
  childProcess.execSync('npm run build', { stdio: 'inherit', cwd: moduleDirPath });
};

const serverMessage = (port: number) => {
  return `\n ${chalk.green('Fragy local preview server running at:')}\n\n   ${chalk.blue(
    `- http://localhost:${port}`,
  )}\n\n ${chalk.yellow('Note this server is only for preview.')}\n\n`;
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
      // init server
      const server = createServer(distPath);
      // watch files
      const postsDirPath = path.resolve(app.workDir, './.fragy/posts');
      if (!fs.existsSync(postsDirPath)) {
        await fsp.mkdir(postsDirPath, { recursive: true });
      }
      const watcher = fs.watch(postsDirPath, {
        recursive: true,
        encoding: 'utf-8',
      });
      const moduleDirPath = path.resolve(app.workDir, './node_modules/fragy');
      let changeTimeout: NodeJS.Timeout | null;
      watcher.on('change', async () => {
        if (changeTimeout) {
          clearTimeout(changeTimeout);
          changeTimeout = null;
        }
        changeTimeout = setTimeout(async () => {
          // rebuild feeds
          // eslint-disable-next-line no-console
          console.log(chalk.gray('Detected changes to articles, regenerating feeds...'));
          try {
            childProcess.execSync('npm run generate', {
              cwd: moduleDirPath,
            });
          } catch (err) {
            console.error('Failed to generate feeds.', err);
          }
          // after generate
          const copyPromises: Array<Promise<void>> = [];
          if (fs.existsSync('./.fragy/listFeed.json')) {
            // not splitted
            copyPromises.push(
              fsp.copyFile(
                path.resolve(app.workDir, './.fragy/listFeed.json'),
                path.resolve(app.workDir, './dist/data/listFeed.json'),
              ),
            );
          } else {
            copyPromises.push(
              copyDirectory({
                source: path.resolve(app.workDir, './.fragy/listFeed'),
                dest: path.resolve(app.workDir, './dist/data/listFeed'),
                recursive: true,
              }),
            );
          }
          copyPromises.push(
            copyDirectory({
              source: path.resolve(app.workDir, './.fragy/posts'),
              dest: path.resolve(app.workDir, './dist/posts'),
              recursive: true,
              flatten: true,
              pattern: /\.md$/,
            }),
          );
          let copyFailedError;
          try {
            await Promise.all(copyPromises);
          } catch (e) {
            copyFailedError = e;
          }
          // output message to console
          console.clear();
          if (copyFailedError) {
            app.logger.error('Failed to generate feeds.', copyFailedError, '\n\n');
          }
          console.log(
            `${
              !copyFailedError && chalk.green('\n New feeds were generated successfully.\n')
            }${serverMessage(port)}`,
          );
        }, 100);
      });
      // start server
      const port = await portfinder.getPortPromise({
        port: 8080,
        stopPort: 8090,
      });
      server.listen(port);
      console.clear();
      console.log(serverMessage(port));
      await open(`http://localhost:${port}`);
    });
};

export default mount;
