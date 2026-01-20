ALTER TYPE "public"."access" ADD VALUE 'traditional_track';--> statement-breakpoint
ALTER TYPE "public"."roof_material" ADD VALUE 'stone';--> statement-breakpoint
ALTER TYPE "public"."roof_shape" ADD VALUE 'false_dome';--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "plan_shape" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."plan_shape";--> statement-breakpoint
CREATE TYPE "public"."plan_shape" AS ENUM('circular', 'quadrangular', 'rectangular', 'irregular');--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "plan_shape" SET DATA TYPE "public"."plan_shape" USING "plan_shape"::"public"."plan_shape";--> statement-breakpoint
ALTER TABLE "water_lines" ADD COLUMN "construction_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "water_lines" ADD CONSTRAINT "water_lines_construction_id_constructions_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_lines" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "water_lines" ADD CONSTRAINT "water_lines_construction_id_unique" UNIQUE("construction_id");