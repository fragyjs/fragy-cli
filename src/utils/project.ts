import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { Application } from '../app';

let userConfigCache: any;
let packageJsonCache: any;

export const getUserConfig = async (app: Application) => {
  if (userConfigCache) {
    return userConfigCache;
  }
  const userConfigPath = path.resolve(app.workDir, './fragy.config.js');
  if (!fs.existsSync(userConfigPath)) {
    return null;
  }
  const userConfig = (await import(userConfigPath)).default;
  if (userConfig) {
    userConfigCache = userConfig;
    return userConfig;
  }
  return null;
};

export const getPackageJson = async (app: Application) => {
  if (packageJsonCache) {
    return packageJsonCache;
  }
  const packageJsonPath = path.resolve(app.workDir, './package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  const packageJson = await fsp.readFile(packageJsonPath, { encoding: 'utf-8' });
  try {
    const parsed = JSON.parse(packageJson);
    packageJsonCache = parsed;
    return parsed;
  } catch (err) {
    app.logger.error('Failed to read package.json in user project.', err);
    return null;
  }
};
