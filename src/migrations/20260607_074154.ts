import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "itineraries_days" DROP CONSTRAINT "itineraries_days_starting_point_id_trailheads_id_fk";
  
  ALTER TABLE "itineraries_days" DROP CONSTRAINT "itineraries_days_end_point_id_trailheads_id_fk";
  
  DROP INDEX "itineraries_days_starting_point_idx";
  DROP INDEX "itineraries_days_end_point_idx";
  ALTER TABLE "itineraries_rels" ADD COLUMN "trailheads_id" integer;
  ALTER TABLE "itineraries_rels" ADD CONSTRAINT "itineraries_rels_trailheads_fk" FOREIGN KEY ("trailheads_id") REFERENCES "public"."trailheads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "itineraries_rels_trailheads_id_idx" ON "itineraries_rels" USING btree ("trailheads_id");
  ALTER TABLE "itineraries_days" DROP COLUMN "starting_point_id";
  ALTER TABLE "itineraries_days" DROP COLUMN "end_point_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "itineraries_rels" DROP CONSTRAINT "itineraries_rels_trailheads_fk";
  
  DROP INDEX "itineraries_rels_trailheads_id_idx";
  ALTER TABLE "itineraries_days" ADD COLUMN "starting_point_id" integer NOT NULL;
  ALTER TABLE "itineraries_days" ADD COLUMN "end_point_id" integer NOT NULL;
  ALTER TABLE "itineraries_days" ADD CONSTRAINT "itineraries_days_starting_point_id_trailheads_id_fk" FOREIGN KEY ("starting_point_id") REFERENCES "public"."trailheads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "itineraries_days" ADD CONSTRAINT "itineraries_days_end_point_id_trailheads_id_fk" FOREIGN KEY ("end_point_id") REFERENCES "public"."trailheads"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "itineraries_days_starting_point_idx" ON "itineraries_days" USING btree ("starting_point_id");
  CREATE INDEX "itineraries_days_end_point_idx" ON "itineraries_days" USING btree ("end_point_id");
  ALTER TABLE "itineraries_rels" DROP COLUMN "trailheads_id";`)
}
