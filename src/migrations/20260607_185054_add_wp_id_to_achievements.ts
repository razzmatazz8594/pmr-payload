import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievements" ADD COLUMN "_wp_id" numeric;
  ALTER TABLE "achievements" ADD COLUMN "_wp_slug" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievements" DROP COLUMN "_wp_id";
  ALTER TABLE "achievements" DROP COLUMN "_wp_slug";`)
}
