import * as migration_20260606_233824 from './20260606_233824';
import * as migration_20260607_074154 from './20260607_074154';
import * as migration_20260607_084403 from './20260607_084403';
import * as migration_20260607_172706 from './20260607_172706';
import * as migration_20260607_182151 from './20260607_182151';
import * as migration_20260607_184810 from './20260607_184810';
import * as migration_20260607_185054_add_wp_id_to_achievements from './20260607_185054_add_wp_id_to_achievements';
import * as migration_20260608_182540_add_geojson_to_itineraries from './20260608_182540_add_geojson_to_itineraries';
import * as migration_20260608_184537_change_geojson_field_from_file_to_json from './20260608_184537_change_geojson_field_from_file_to_json';
import * as migration_20260608_190839_add_wp_import_stuff_to_trailheads from './20260608_190839_add_wp_import_stuff_to_trailheads';

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
    name: '20260607_172706',
  },
  {
    up: migration_20260607_182151.up,
    down: migration_20260607_182151.down,
    name: '20260607_182151',
  },
  {
    up: migration_20260607_184810.up,
    down: migration_20260607_184810.down,
    name: '20260607_184810',
  },
  {
    up: migration_20260607_185054_add_wp_id_to_achievements.up,
    down: migration_20260607_185054_add_wp_id_to_achievements.down,
    name: '20260607_185054_add_wp_id_to_achievements',
  },
  {
    up: migration_20260608_182540_add_geojson_to_itineraries.up,
    down: migration_20260608_182540_add_geojson_to_itineraries.down,
    name: '20260608_182540_add_geojson_to_itineraries',
  },
  {
    up: migration_20260608_184537_change_geojson_field_from_file_to_json.up,
    down: migration_20260608_184537_change_geojson_field_from_file_to_json.down,
    name: '20260608_184537_change_geojson_field_from_file_to_json',
  },
  {
    up: migration_20260608_190839_add_wp_import_stuff_to_trailheads.up,
    down: migration_20260608_190839_add_wp_import_stuff_to_trailheads.down,
    name: '20260608_190839_add_wp_import_stuff_to_trailheads'
  },
];
