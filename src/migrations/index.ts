import * as migration_20260606_233824 from './20260606_233824';
import * as migration_20260607_074154 from './20260607_074154';

export const migrations = [
  {
    up: migration_20260606_233824.up,
    down: migration_20260606_233824.down,
    name: '20260606_233824',
  },
  {
    up: migration_20260607_074154.up,
    down: migration_20260607_074154.down,
    name: '20260607_074154'
  },
];
