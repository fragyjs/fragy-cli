import commander from 'commander';
import NpmApi from 'npm-api';
import inquirer from 'inquirer';
import shelljs from 'shelljs';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import childProcess from 'child_process';
import { Application } from '../app';
import { getIntegrity } from '../utils/integrity';
import { extractTgz } from '../utils/tarball';
import { downloadFileWithProgress } from '../utils/download';
import { fragyConfigTemplate } from '../template/fragyConfig';
import chalk from 'chalk';

interface FragyInitUserConfig {
  title: string;
  subtitle: string;
  theme: string;
}

const npm = new NpmApi();

const downloadAndExtract = async (app: Application) => {
  const repo = npm.repo('fragy');
  let pkg: any;
  try {
    pkg = await repo.package();
  } catch (err) {
    app.logger.error('Failed to fetch the package info of fragy.', err);
    return;
  }
  const { version: pkgVersion } = pkg;
  const { tarball, shasum } = pkg.dist;
  app.logger.info(`Detected fragy package (v${pkgVersion}).`);
  const tarballPath = path.resolve(app.tempDir, `./fragy_${pkgVersion}.tar.gz`);
  // check tarball path
  if (fs.existsSync(tarballPath)) {
    app.logger.debug('Existed cache tarball was found, check integrity...');
    const integrity = getIntegrity(tarballPath);
    if (integrity === shasum) {
      app.logger.debug('Extracting files to current work directory...');
      await extractTgz(tarballPath, app.workDir);
    } else {
      app.logger.debug('Existed cache tarball integrity is not matched, download it.');
      await fsp.unlink(tarballPath);
    }
  } else {
    // no existed cache
    await downloadFileWithProgress({
      source: tarball,
      targetPath: tarballPath,
      message: 'Downloading fragy published tarball from npm... [{bar}] {percentage}%',
    });
    // after download
    const integrity = getIntegrity(tarballPath);
    if (integrity !== shasum) {
      app.logger.error(
        'The downloaded tarball is damaged, please try to initialize your project again.',
      );
      await fsp.unlink(tarball);
      return;
    }
    app.logger.debug('Extracting files from downloaded tarball...');
    await extractTgz(tarballPath, app.workDir);
  }
};

const mount = (app: Application, program: commander.Command): void => {
  program
    .command('init')
    .description('Initialize a fragy project')
    .action(async () => {
      // download and extract fragy tarball
      await downloadAndExtract(app);
      // after extract
      const moveRes = shelljs.cp('-r', './package/*', './');
      if (moveRes.code !== 0) {
        throw new Error('Failed to move extracted files of fragy.');
      }
      const deleteRes = shelljs.rm('-r', './package/*', './');
      if (deleteRes.code !== 0) {
        app.logger.warn('Failed to delete redundant folder.');
      }
      // after move
      try {
        childProcess.execSync('npm install', { stdio: 'inherit' });
      } catch (err) {
        app.logger.error('Failed to install dependencies of fragy.');
        return;
      }
      // init configuration
      app.logger.info('Your new project is almost ready, now we need some necessary information.');
      const userConfig: FragyInitUserConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          default: 'New Fragy Site',
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
          default: '',
          validate: (v) => {
            if (v.length > 30) {
              return 'Max length of title is 30.';
            }
          },
        },
        {
          type: 'expand',
          name: 'theme',
          choices: [
            {
              name: 'Purity (Default)',
              value: '@fragy/purity',
            },
          ],
          default: '@fragy/purity',
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
            return true;
          },
        },
      ]);
      // after user input
      try {
        childProcess.execSync(`npm install ${userConfig.theme} --save`);
      } catch (err) {
        app.logger.error('Failed to install theme package.');
        return;
      }
      // write config
      const fragyConfigPath = path.resolve(app.workDir, './fragy.config.js');
      const fragyConfigContent = fragyConfigTemplate
        .replace('{title}', userConfig.title)
        .replace('{subtitle}', userConfig.subtitle)
        .replace('{theme}', userConfig.theme);
      await fsp.writeFile(fragyConfigPath, fragyConfigContent, { encoding: 'utf-8' });
      // eslint-disable-next-line no-console
      console.log(
        `\nYour new fragy project is ready.\nYou can use ${chalk.yellow(
          'fragy serve',
        )} to start a local server.\nIf you want to build your project, use ${chalk.yellow(
          'npm run build',
        )}.\n\nThank you for trying to use fragy, if you like this project, it's welcome to give us a star at GitHub. ❤`,
      );
    });
};

export default mount;
