import commander from 'commander';
import inquirer from 'inquirer';
import open from 'open';
import path from 'path';
import fsp from 'fs/promises';
import fs from 'fs';
import dayjs from 'dayjs';
import newPostTemplate from '../template/newPost';
import { Application } from '../app';
import chalk from 'chalk';

const mount = async (app: Application, program: commander.Command) => {
  const cmd = program.command('create').description('Create things like post');
  cmd
    .command('post')
    .description('Create a post')
    .option('-s', '--slient', 'Do not open the file after creating')
    .action(async (options) => {
      const storedMainProjectPath = app.storage.get('main_project_path');
      const currentPostPath = path.resolve(app.workDir, './.fragy/posts');
      let userPostPath: string;
      if (!fs.existsSync(currentPostPath)) {
        if (!storedMainProjectPath) {
          app.logger.error('Cannot locate the posts folder.');
          return;
        }
        const storedProjectPostsPath = path.resolve(storedMainProjectPath, './.fragy/posts');
        if (!fs.existsSync(storedProjectPostsPath)) {
          app.logger.error('Cannot locate the posts folder.');
          return;
        }
        userPostPath = storedProjectPostsPath;
      } else {
        userPostPath = currentPostPath;
      }
      // eslint-disable-next-line no-console
      console.log(chalk.blue('We need some necessary information for creating a new post.'));
      const userInput: Record<string, string> = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Article title:',
          validate: (v) => {
            if (!v) {
              return 'Article title cannot be empty.';
            }
            return true;
          },
        },
      ]);
      // create new post file
      const newPostPath = path.resolve(userPostPath, `./${userInput.title}.md`);
      if (fs.existsSync(newPostPath)) {
        app.logger.error('This title has already been used, please use another one.');
        return;
      }
      const template = `${newPostTemplate
        .replace('{title}', userInput.title)
        .replace('{date}', dayjs().format('YYYY-MM-DD HH:mm:ss'))
        .trim()}\n`;
      await fsp.writeFile(newPostPath, template, { encoding: 'utf-8' });
      app.logger.info('Your new post is ready, you can edit it now.');
      // open
      if (!options.noOpen) {
        await open(newPostPath);
      }
    });
};

export default mount;
