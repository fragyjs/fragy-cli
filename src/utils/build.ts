import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { hashElement } from 'folder-hash';
import { Application } from '../app';
import { getPackageJson, getUserConfig } from './project';

const generateBuildHash = async (app: Application) => {
  try {
    const userConfig = await getUserConfig(app);
    const packageJson = await getPackageJson(app);
    if (!userConfig || !packageJson) {
      return null;
    }
    const themePkg = userConfig.theme.package;
    const fragyVer = packageJson.dependencies.fragy;
    const themeVer = packageJson.dependencies[themePkg];
    const userConfigStr = JSON.stringify(userConfig);
    const customComponentPath = path.resolve(app.workDir, './.fragy/components');
    const customComponentHash = fs.existsSync(customComponentPath)
      ? await hashElement(customComponentPath)
      : '';
    const shaHash = crypto
      .createHash('sha256')
      .update(
        `${userConfigStr}__${fragyVer}__${themeVer}__${
          customComponentHash || 'no-custom-component'
        }`,
      );
    return {
      projectName: packageJson.name as string,
      hash: shaHash.digest('base64'),
    };
  } catch (err) {
    app.logger.error('Failed to generate build hash.', err);
    return null;
  }
};

export const getLastBuildHash = async (app: Application) => {
  try {
    const packageJson = await getPackageJson(app);
    if (!packageJson) {
      return null;
    }
    const { name: projectName } = packageJson;
    return app.storage.get(`last-build-hash__${projectName}`);
  } catch (err) {
    app.logger.error('Failed to get last build hash.', err);
    return null;
  }
};

export const setLastBuildHash = async (app: Application) => {
  const buildHash = await generateBuildHash(app);
  if (!buildHash) {
    return;
  }
  app.storage.set(`last-build-hash__${buildHash.projectName}`, buildHash.hash);
};

export const shouldSkipBuild = async (app: Application) => {
  const [lastBuildHash, currentBuildHash] = await Promise.all([
    getLastBuildHash(app),
    generateBuildHash(app),
  ]);
  if (!lastBuildHash || !currentBuildHash) {
    return false;
  }
  return lastBuildHash === currentBuildHash.hash;
};
