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
import { copyDirectory } from '../utils/fs';
import { execAsync } from '../utils/exec';
import startServer from '../utils/localServer';

interface ServeCommandOpts {
  port?: string;
}

const buildSite = async (app: Application, promise = false) => {
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
  promise
    ? await execAsync('npm run build', { cwd: moduleDirPath })
    : childProcess.execSync('npm run build', { stdio: 'inherit', cwd: moduleDirPath });
};

const generateFeeds = async (app: Application, promise = false) => {
  const moduleDirPath = path.resolve(app.workDir, './node_modules/fragy');
  promise
    ? await execAsync('npm run build', { cwd: moduleDirPath })
    : childProcess.execSync('npm run generate', {
        cwd: moduleDirPath,
      });
};

const copyGeneratedFiles = async (app: Application) => {
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
        force: true,
      }),
    );
  }
  copyPromises.push(
    copyDirectory({
      source: path.resolve(app.workDir, './.fragy/posts'),
      dest: path.resolve(app.workDir, './dist/data/posts'),
      recursive: true,
      flatten: true,
      force: true,
      pattern: /\.md$/,
    }),
  );
  await Promise.all(copyPromises);
};

const serverMessage = (port: number) => {
  return `\n ${chalk.green('Fragy local preview server running at:')}\n\n   ${chalk.blue(
    `- http://localhost:${port}`,
  )}\n\n ${chalk.yellow('This server is only for preview.')}\n\n`;
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
    .option('-p <port>, --port', 'Specify the listening port of preview server.')
    .action(async (options: ServeCommandOpts) => {
      const distPath = path.resolve(app.workDir, './dist');

      console.log(chalk.cyan('Building the static files from Fragy sources...'));

      try {
        await Promise.all([buildSite(app, true), generateFeeds(app, true)]);
        await copyGeneratedFiles(app);
      } catch {
        console.log(chalk.red('Cannot finish the initial build.'));
      }

      // start server
      const userPort = options.port ? Number(options.port) : 8080;
      const port = await portfinder.getPortPromise({
        port: userPort,
        stopPort: userPort + 10,
      });
      const { events: serverEvents } = startServer(distPath, port);

      // watch posts
      const postsDirPath = path.resolve(app.workDir, './.fragy/posts');
      if (!fs.existsSync(postsDirPath)) {
        await fsp.mkdir(postsDirPath, { recursive: true });
      }
      const watcher = fs.watch(postsDirPath, {
        recursive: true,
        encoding: 'utf-8',
      });

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
            generateFeeds(app);
          } catch {
            console.log(chalk.red('Failed to generate feeds.'));
            return;
          }
          // after generate
          let copyFailedError;
          try {
            await copyGeneratedFiles(app);
          } catch (e) {
            copyFailedError = e;
          }
          // send refresh through websocket
          serverEvents.emit('refresh');
          // output message to console
          console.log('\u001Bc');
          if (copyFailedError) {
            app.logger.error('Failed to generate feeds.', copyFailedError, '\n\n');
          }
          console.log(
            `${
              !copyFailedError && chalk.green(' New feeds were generated successfully.\n')
            }${serverMessage(port)}`,
          );
        }, 300);
      });

      // watch config file
      const configPath = path.resolve(app.workDir, './fragy.config.js');
      const configWatcher = fs.watch(configPath, { encoding: 'utf-8' });
      let configChangeTimeout: NodeJS.Timeout | null;
      configWatcher.on('change', async () => {
        if (configChangeTimeout) {
          clearTimeout(configChangeTimeout);
          configChangeTimeout = null;
        }
        configChangeTimeout = setTimeout(async () => {
          // config changed, rebuild the project
          console.log(chalk.gray('Detected changes to fragy configuration, rebuilding project...'));
          await buildSite(app);
          // send refresh
          serverEvents.emit('refresh');
          console.log(
            `${chalk.green(' Project has been rebuilt successfully.\n')}${serverMessage(port)}`,
          );
        }, 500);
      });
      // output messages
      console.log(`\u001Bc${serverMessage(port)}`);
      // open page in browser
      await open(`http://localhost:${port}`);
    });
};

export default mount;
