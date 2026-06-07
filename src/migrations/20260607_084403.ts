import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "achievements_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"description" jsonb
  );
  
  CREATE TABLE "achievements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"achievement" varchar NOT NULL,
  	"description" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "achievements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"objectives_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "achievements_id" integer;
  ALTER TABLE "achievements_groups" ADD CONSTRAINT "achievements_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_objectives_fk" FOREIGN KEY ("objectives_id") REFERENCES "public"."objectives"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "achievements_groups_order_idx" ON "achievements_groups" USING btree ("_order");
  CREATE INDEX "achievements_groups_parent_id_idx" ON "achievements_groups" USING btree ("_parent_id");
  CREATE INDEX "achievements_updated_at_idx" ON "achievements" USING btree ("updated_at");
  CREATE INDEX "achievements_created_at_idx" ON "achievements" USING btree ("created_at");
  CREATE INDEX "achievements_rels_order_idx" ON "achievements_rels" USING btree ("order");
  CREATE INDEX "achievements_rels_parent_idx" ON "achievements_rels" USING btree ("parent_id");
  CREATE INDEX "achievements_rels_path_idx" ON "achievements_rels" USING btree ("path");
  CREATE INDEX "achievements_rels_objectives_id_idx" ON "achievements_rels" USING btree ("objectives_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_achievements_fk" FOREIGN KEY ("achievements_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_achievements_id_idx" ON "payload_locked_documents_rels" USING btree ("achievements_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievements_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "achievements_groups" CASCADE;
  DROP TABLE "achievements" CASCADE;
  DROP TABLE "achievements_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_achievements_fk";
  
  DROP INDEX "payload_locked_documents_rels_achievements_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "achievements_id";`)
}
