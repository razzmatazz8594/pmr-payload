import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "campgrounds" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"campground" varchar NOT NULL,
  	"latitude" numeric NOT NULL,
  	"longitude" numeric NOT NULL,
  	"elevation" numeric,
  	"description" jsonb,
  	"_wp_id" numeric,
  	"_wp_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "campgrounds_id" integer;
  CREATE INDEX "campgrounds_updated_at_idx" ON "campgrounds" USING btree ("updated_at");
  CREATE INDEX "campgrounds_created_at_idx" ON "campgrounds" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campgrounds_fk" FOREIGN KEY ("campgrounds_id") REFERENCES "public"."campgrounds"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_campgrounds_id_idx" ON "payload_locked_documents_rels" USING btree ("campgrounds_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "campgrounds" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "campgrounds" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_campgrounds_fk";
  
  DROP INDEX "payload_locked_documents_rels_campgrounds_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "campgrounds_id";`)
}
