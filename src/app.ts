import path from 'path';
import fs from 'fs';
import log4js from 'log4js';
import { getStorage, FragyStorage } from './utils/storage';
import logger from './utils/logger';

interface Application {
  logger: log4js.Logger;
  tempDir: string;
  workDir: string;
  storage: FragyStorage;
}

const tempDir = path.resolve(__dirname, '../temp');

// create temp dir
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const app: Application = {
  logger,
  tempDir,
  workDir: process.cwd(),
  storage: getStorage(),
};

export { Application, app };
