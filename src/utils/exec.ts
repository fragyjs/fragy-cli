import childProcess from 'child_process';

export const execAsync = (cmd: string, options?: childProcess.ExecOptions): Promise<void> => {
  const child = childProcess.exec(cmd, options);
  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      }
      reject(code);
    });
  });
};
