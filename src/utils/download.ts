import chalk from 'chalk';
import request, { SuperAgentRequest } from 'superagent';
import fs from 'fs';
import progress from 'cli-progress';

interface DownloadParams {
  source: string;
  targetPath: string;
  message?: string;
}

export const downloadFileWithProgress = async ({
  source,
  targetPath,
  message,
}: DownloadParams): Promise<void> => {
  const bar = new progress.SingleBar({
    format: chalk.cyan(message || `Downloading file from ${source}... [{bar}] {percentage}%`),
    hideCursor: true,
  });
  const req = request.get(source);
  bar.start(100, 0);
  req.on('progress', (e) => {
    bar.update(e.percent || 0);
  });
  try {
    await writeFileFromReq(req, targetPath);
    bar.update(bar.getTotal());
    bar.stop();
  } catch (err) {
    bar.stop();
    throw err;
  }
};

export const writeFileFromReq = async (req: SuperAgentRequest, path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(path);
    ws.on('finish', () => {
      resolve();
    });
    ws.on('error', (err) => {
      reject(err);
    });
    req.pipe(ws);
  });
};
