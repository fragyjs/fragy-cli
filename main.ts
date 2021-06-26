import commander from 'commander';
import { name, version } from './package.json';
import { app } from './src/app';
import modules from './src/modules';

const program = new commander.Command();

program.name(name);
program.version(version);

// load modules
modules.forEach(async (mountMethod) => {
  await mountMethod(app, program);
});

program.parse();
