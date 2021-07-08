import path from 'path';
import fs from 'fs';
import { userDir } from '../constants/path';

export interface FragyStorage {
  path: string;
  data: Record<string, string>;
  get: (key: string) => string;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
}

const storageDir = path.resolve(userDir, './.fragy');

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

export const getStorage = () => {
  const storage: FragyStorage = {
    path: path.resolve(storageDir, './storage.json'),
    data: {},
    get(key: string) {
      return this.data[key];
    },
    set(key: string, value: string) {
      this.data[key] = value;
      fs.writeFileSync(this.path, JSON.stringify(this.data), { encoding: 'utf-8' });
    },
    remove(key: string) {
      if (typeof this.data[key] !== 'undefined') {
        delete this.data[key];
        fs.writeFileSync(this.path, JSON.stringify(this.data), { encoding: 'utf-8' });
      }
    },
  };
  return storage;
};
