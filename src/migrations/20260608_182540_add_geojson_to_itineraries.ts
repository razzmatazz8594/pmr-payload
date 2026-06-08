import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "itineraries_days" ADD COLUMN "route_id" integer;
  ALTER TABLE "itineraries_days" ADD CONSTRAINT "itineraries_days_route_id_media_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "itineraries_days_route_idx" ON "itineraries_days" USING btree ("route_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "itineraries_days" DROP CONSTRAINT "itineraries_days_route_id_media_id_fk";
  
  DROP INDEX "itineraries_days_route_idx";
  ALTER TABLE "itineraries_days" DROP COLUMN "route_id";`)
}
