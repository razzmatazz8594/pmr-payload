import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "objectives" RENAME COLUMN "prominence" TO "prominence_ft";
  ALTER TABLE "objectives" RENAME COLUMN "isolation" TO "isolation_mi";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "objectives" RENAME COLUMN "prominence_ft" TO "prominence";
  ALTER TABLE "objectives" RENAME COLUMN "isolation_mi" TO "isolation";`)
}
