import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
export default {
  experimental: { externalDir: true },
  outputFileTracingRoot: path.resolve(directory, '../../..'),
};
