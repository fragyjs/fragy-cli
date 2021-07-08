import commander from 'commander';
import NpmApi from 'npm-api';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import childProcess from 'child_process';
import chalk from 'chalk';
import dayjs from 'dayjs';
import { Application } from '../app';
import { fragyConfigTemplate } from '../template/fragyConfig';
import firstPostTemplate from '../template/firstPost';

interface FragyInitUserConfig {
  projectName: string;
  projectAuthor: string;
  title: string;
  subtitle: string;
  locale: string;
  theme: string;
}

const npm = new NpmApi();

const mount = (app: Application, program: commander.Command): void => {
  program
    .command('init')
    .description('Initialize a fragy project')
    .action(async () => {
      app.logger.info('Firstly, we need some necessary information for initializing your project.');
      const userConfig: FragyInitUserConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          default: 'my-fragy-site',
          message: 'Project name:',
          validate: (v) => {
            if (!v) {
              return 'Project name cannot be empty.';
            }
            if (!/^[a-zA-Z0-9-]+$/.test(v)) {
              return 'Project name can only be letters, numbers and short line.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'projectAuthor',
          message: 'Your name as the project author:',
          validate: (v) => {
            if (!v) {
              return 'Project author cannot be empty.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'title',
          default: 'New Fragy Site',
          message: 'Site title:',
          validate: (v) => {
            if (!v) {
              return 'Title cannot be empty.';
            }
            if (v.length > 20) {
              return 'Max length of title is 20.';
            }
            return true;
          },
        },
        {
          type: 'input',
          name: 'subtitle',
          message: 'Site subtitle (optional):',
          validate: (v) => {
            if (v && v.length > 30) {
              return 'Max length of title is 30.';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'locale',
          message: 'Main language of your site:',
          default: 'zh-CN',
          choices: [
            {
              name: '中文',
              value: 'zh-CN',
            },
            {
              name: 'English',
              value: 'en',
            },
          ],
        },
        {
          type: 'list',
          name: 'theme',
          message: 'Choose a theme which you want to use:',
          choices: [
            {
              name: 'Purity (Default)',
              value: '@fragy/purity',
            },
            {
              name: 'Custom',
              value: 'custom',
            },
          ],
          default: '@fragy/purity',
        },
      ]);
      if (userConfig.theme === 'custom') {
        const userTheme: Record<string, string> = await inquirer.prompt([
          {
            type: 'input',
            name: 'pkg',
            message: 'Package name of the custom theme:',
            validate: async (themePkg) => {
              app.logger.debug('Fetching package info from npm...');
              const repo = npm.repo(themePkg);
              try {
                await repo.package();
              } catch (err) {
                if (err.message === 'Not Found') {
                  return 'Failed to find this package from npm, please check your input.';
                }
                return 'Failed to fetch the package info from npm, please retry again.';
              }
            },
          },
        ]);
        userConfig.theme = userTheme.pkg;
      }
      // create package.json
      const pkgInfo = {
        name: userConfig.projectName,
        author: userConfig.projectAuthor,
        version: '1.0.0',
      };
      app.logger.debug('Creating package.json...');
      await fsp.writeFile(
        path.resolve(app.workDir, './package.json'),
        JSON.stringify(pkgInfo, null, '  '),
        { encoding: 'utf-8' },
      );
      // install fragy
      app.logger.debug('Installing fragy...');
      try {
        childProcess.execSync(`npm install fragy --save`, { stdio: 'inherit' });
      } catch (err) {
        app.logger.error('Failed to install fragy.');
        return;
      }
      // install theme
      app.logger.debug(`Installing theme [${userConfig.theme}] for fragy...`);
      try {
        childProcess.execSync(`npm install ${userConfig.theme} --save`, { stdio: 'inherit' });
      } catch (err) {
        app.logger.error('Failed to install theme package.');
        return;
      }
      // write config
      const fragyConfigPath = path.resolve(app.workDir, './fragy.config.js');
      const fragyConfigContent = fragyConfigTemplate
        .replace('{title}', userConfig.title)
        .replace('{subtitle}', userConfig.subtitle || '')
        .replace('{theme}', userConfig.theme)
        .replace('{locale}', userConfig.locale);
      await fsp.writeFile(fragyConfigPath, fragyConfigContent, { encoding: 'utf-8' });
      // create fragy user data folder
      const userPostsFolder = path.resolve(app.workDir, './.fragy/posts');
      if (!fs.existsSync(userPostsFolder)) {
        fs.mkdirSync(userPostsFolder, { recursive: true });
      }
      const firstPostPath = path.resolve(userPostsFolder, './helloworld.md');
      await fsp.writeFile(
        firstPostPath,
        firstPostTemplate.trim().replace('{date}', dayjs().format('YYYY-MM-DD HH:mm:ss')),
        {
          encoding: 'utf-8',
        },
      );
      // eslint-disable-next-line no-console
      console.log(
        `\n===========================\n${chalk.green(
          'Your new fragy project is ready.',
        )}\n\nYou can use ${chalk.yellow(
          'fragy serve',
        )} to start a local server.\nIf you want to build your project, use ${chalk.yellow(
          'fragy build',
        )}.\n\nThank you for trying to use fragy, if you like this project.\nIt's welcome to give us a star at GitHub. ❤`,
      );
    });
};

export default mount;
