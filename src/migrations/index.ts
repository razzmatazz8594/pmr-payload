import * as migration_20260606_233824 from './20260606_233824';
import * as migration_20260607_074154 from './20260607_074154';
import * as migration_20260607_084403 from './20260607_084403';
import * as migration_20260607_172706 from './20260607_172706';

export const migrations = [
  {
    up: migration_20260606_233824.up,
    down: migration_20260606_233824.down,
    name: '20260606_233824',
  },
  {
    up: migration_20260607_074154.up,
    down: migration_20260607_074154.down,
    name: '20260607_074154',
  },
  {
    up: migration_20260607_084403.up,
    down: migration_20260607_084403.down,
    name: '20260607_084403',
  },
  {
    up: migration_20260607_172706.up,
    down: migration_20260607_172706.down,
    name: '20260607_172706'
  },
];
