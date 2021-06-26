import fs from 'fs';
import ssri from 'ssri';

export const getIntegrity = async (filePath: string) => {
  const integrity = await ssri.fromStream(fs.createReadStream(filePath), { algorithms: ['sha1'] });
  return integrity.hexDigest();
};
