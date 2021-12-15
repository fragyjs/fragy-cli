import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

interface CopyDirOptions {
  source: string;
  dest: string;
  recursive?: boolean;
  baseDest?: string;
  flatten?: boolean;
  force?: boolean;
  pattern?: RegExp;
}

export const copyDirectory = async ({
  source,
  dest,
  baseDest = dest,
  recursive = false,
  flatten = false,
  force = false,
  pattern,
}: CopyDirOptions) => {
  const filenames = await fsp.readdir(source);
  await Promise.all(
    filenames.map(async (filename) => {
      // pattern test
      if (pattern && !pattern.test(filename)) {
        return;
      }
      // copy files
      const sourceTargetPath = path.resolve(source, `./${filename}`);
      const destTargetPath = path.resolve(dest, `./${filename}`);
      const stat = await fsp.stat(sourceTargetPath);
      if (stat.isDirectory()) {
        if (!recursive) {
          return;
        }
        await copyDirectory({
          source: sourceTargetPath,
          dest: destTargetPath,
          recursive,
          flatten,
          force,
          baseDest,
        });
      } else {
        let destFilePath: string;
        if (flatten) {
          destFilePath = path.resolve(baseDest, `./${filename}`);
        } else {
          destFilePath = destTargetPath;
        }
        const baseDirPath = path.dirname(destFilePath);
        if (!fs.existsSync(baseDirPath)) {
          await fsp.mkdir(baseDirPath);
        }
        if (force && fs.existsSync(destFilePath)) {
          await fsp.unlink(destFilePath);
        }
        await fsp.copyFile(sourceTargetPath, destFilePath);
      }
    }),
  );
};
