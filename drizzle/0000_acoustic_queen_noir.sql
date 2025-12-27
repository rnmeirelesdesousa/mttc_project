CREATE TYPE "public"."access" AS ENUM('pedestrian', 'car', 'difficult_none');--> statement-breakpoint
CREATE TYPE "public"."conservation_state" AS ENUM('very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin');--> statement-breakpoint
CREATE TYPE "public"."construction_technique" AS ENUM('stone_masonry', 'adobe', 'mixed', 'concrete', 'wood');--> statement-breakpoint
CREATE TYPE "public"."current_use" AS ENUM('milling', 'housing', 'tourism', 'ruin', 'museum');--> statement-breakpoint
CREATE TYPE "public"."epoch" AS ENUM('18th_c', '19th_c', '20th_c', 'pre_18th_c');--> statement-breakpoint
CREATE TYPE "public"."legal_protection" AS ENUM('inexistent', 'under_study', 'classified');--> statement-breakpoint
CREATE TYPE "public"."plan_shape" AS ENUM('circular', 'rectangular', 'square', 'polygonal', 'irregular');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('private', 'public', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."roof_shape" AS ENUM('conical', 'pyramidal', 'domed', 'flat', 'gabled', 'none');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'review', 'published');--> statement-breakpoint
CREATE TYPE "public"."typology" AS ENUM('azenha', 'rodizio', 'mare', 'torre_fixa', 'giratorio', 'velas', 'armacao');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('public', 'researcher', 'admin');--> statement-breakpoint
CREATE TYPE "public"."water_captation" AS ENUM('direct', 'channel', 'reservoir', 'aqueduct', 'none');--> statement-breakpoint
CREATE TYPE "public"."wind_apparatus" AS ENUM('fixed', 'rotating', 'adjustable', 'none');--> statement-breakpoint
CREATE TABLE "construction_translations" (
	"construction_id" uuid NOT NULL,
	"lang_code" varchar(2) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"observations_structure" text,
	"observations_roof" text,
	CONSTRAINT "construction_translations_construction_id_lang_code_pk" PRIMARY KEY("construction_id","lang_code")
);
--> statement-breakpoint
CREATE TABLE "constructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"type_category" varchar(50) DEFAULT 'MILL' NOT NULL,
	"geom" "geography" NOT NULL,
	"district" text,
	"municipality" text,
	"parish" text,
	"address" text,
	"drainage_basin" text,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constructions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "mills_data" (
	"construction_id" uuid PRIMARY KEY NOT NULL,
	"typology" "typology" NOT NULL,
	"access" "access",
	"legal_protection" "legal_protection",
	"property_status" "property_status",
	"plan_shape" "plan_shape",
	"construction_technique" "construction_technique",
	"roof_shape" "roof_shape",
	"roof_material" text,
	"water_captation" "water_captation",
	"rodizio_qty" integer,
	"wind_apparatus" "wind_apparatus",
	"millstones_pairs" integer,
	"rating_structure" "conservation_state",
	"rating_roof" "conservation_state",
	"rating_hydraulic" "conservation_state",
	"rating_mechanism" "conservation_state",
	"rating_overall" "conservation_state",
	"has_oven" boolean DEFAULT false,
	"has_miller_house" boolean DEFAULT false,
	"epigraphy_presence" boolean DEFAULT false,
	"epoch" "epoch",
	"current_use" "current_use"
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'public' NOT NULL,
	"full_name" varchar(255),
	"academic_affiliation" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "construction_translations" ADD CONSTRAINT "construction_translations_construction_id_constructions_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "constructions" ADD CONSTRAINT "constructions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mills_data" ADD CONSTRAINT "mills_data_construction_id_constructions_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "constructions_slug_idx" ON "constructions" USING btree ("slug");