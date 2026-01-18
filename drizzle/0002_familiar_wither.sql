CREATE TYPE "public"."admission_azenha" AS ENUM('calha_superior', 'canal_inferior');--> statement-breakpoint
CREATE TYPE "public"."admission_rodizio" AS ENUM('cubo', 'calha');--> statement-breakpoint
CREATE TYPE "public"."captation_type" AS ENUM('weir', 'pool', 'direct');--> statement-breakpoint
CREATE TYPE "public"."conduction_state" AS ENUM('operational_clean', 'clogged', 'damaged_broken');--> statement-breakpoint
CREATE TYPE "public"."conduction_type" AS ENUM('levada', 'modern_pipe');--> statement-breakpoint
CREATE TYPE "public"."epigraphy_location" AS ENUM('door_jambs', 'interior_walls', 'millstones', 'other');--> statement-breakpoint
CREATE TYPE "public"."epigraphy_type" AS ENUM('dates', 'initials', 'religious_symbols', 'counting_marks');--> statement-breakpoint
CREATE TYPE "public"."exterior_finish" AS ENUM('exposed', 'plastered', 'whitewashed');--> statement-breakpoint
CREATE TYPE "public"."millstone_state" AS ENUM('complete', 'disassembled', 'fragmented', 'missing');--> statement-breakpoint
CREATE TYPE "public"."motive_apparatus" AS ENUM('sails', 'shells', 'tail', 'cap');--> statement-breakpoint
CREATE TYPE "public"."roof_material" AS ENUM('tile', 'zinc', 'thatch', 'slate');--> statement-breakpoint
CREATE TYPE "public"."setting" AS ENUM('rural', 'urban', 'isolated', 'riverbank');--> statement-breakpoint
CREATE TYPE "public"."volumetry" AS ENUM('cylindrical', 'conical', 'prismatic_sq_rec');--> statement-breakpoint
CREATE TYPE "public"."wheel_type_azenha" AS ENUM('copeira', 'dezio_palas');--> statement-breakpoint
CREATE TYPE "public"."wheel_type_rodizio" AS ENUM('penas', 'colheres');--> statement-breakpoint
ALTER TYPE "public"."plan_shape" ADD VALUE 'circular_tower';--> statement-breakpoint
ALTER TYPE "public"."plan_shape" ADD VALUE 'quadrangular';--> statement-breakpoint
CREATE TABLE "water_line_translations" (
	"water_line_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "water_line_translations_water_line_id_locale_pk" PRIMARY KEY("water_line_id","locale")
);
--> statement-breakpoint
CREATE TABLE "water_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"path" geometry(LineString, 4326) NOT NULL,
	"color" varchar(7) DEFAULT '#3b82f6' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "water_lines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "construction_technique" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."construction_technique";--> statement-breakpoint
CREATE TYPE "public"."construction_technique" AS ENUM('dry_stone', 'mortared_stone', 'mixed_other');--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "construction_technique" SET DATA TYPE "public"."construction_technique" USING "construction_technique"::"public"."construction_technique";--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "roof_shape" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."roof_shape";--> statement-breakpoint
CREATE TYPE "public"."roof_shape" AS ENUM('conical', 'gable', 'lean_to', 'inexistent');--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "roof_shape" SET DATA TYPE "public"."roof_shape" USING "roof_shape"::"public"."roof_shape";--> statement-breakpoint
ALTER TABLE "mills_data" ALTER COLUMN "roof_material" SET DATA TYPE "public"."roof_material" USING "roof_material"::"public"."roof_material";--> statement-breakpoint
ALTER TABLE "construction_translations" ADD COLUMN "observations_hydraulic" text;--> statement-breakpoint
ALTER TABLE "construction_translations" ADD COLUMN "observations_mechanism" text;--> statement-breakpoint
ALTER TABLE "construction_translations" ADD COLUMN "observations_general" text;--> statement-breakpoint
ALTER TABLE "constructions" ADD COLUMN "legacy_id" text;--> statement-breakpoint
ALTER TABLE "constructions" ADD COLUMN "custom_icon_url" text;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "setting" "setting";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "volumetry" "volumetry";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "exterior_finish" "exterior_finish";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "captation_type" "captation_type";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "conduction_type" "conduction_type";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "conduction_state" "conduction_state";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "admission_rodizio" "admission_rodizio";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "admission_azenha" "admission_azenha";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "wheel_type_rodizio" "wheel_type_rodizio";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "wheel_type_azenha" "wheel_type_azenha";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "azenha_qty" integer;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "motive_apparatus" "motive_apparatus";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "millstone_quantity" integer;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "millstone_diameter" text;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "millstone_state" "millstone_state";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_tremonha" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_quelha" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_urreiro" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_aliviadouro" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_farinaleiro" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "epigraphy_location" "epigraphy_location";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "epigraphy_type" "epigraphy_type";--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "epigraphy_description" text;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_stable" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "has_fulling_mill" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "water_line_id" uuid;--> statement-breakpoint
ALTER TABLE "water_line_translations" ADD CONSTRAINT "water_line_translations_water_line_id_water_lines_id_fk" FOREIGN KEY ("water_line_id") REFERENCES "public"."water_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "water_lines_slug_idx" ON "water_lines" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "mills_data" ADD CONSTRAINT "mills_data_water_line_id_water_lines_id_fk" FOREIGN KEY ("water_line_id") REFERENCES "public"."water_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mills_data" DROP COLUMN "water_captation";--> statement-breakpoint
ALTER TABLE "mills_data" DROP COLUMN "wind_apparatus";--> statement-breakpoint
ALTER TABLE "mills_data" DROP COLUMN "millstones_pairs";--> statement-breakpoint
DROP TYPE "public"."water_captation";--> statement-breakpoint
DROP TYPE "public"."wind_apparatus";