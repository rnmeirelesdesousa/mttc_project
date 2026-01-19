ALTER TABLE "mills_data" ADD COLUMN "stone_type_granite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "stone_type_schist" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "stone_type_other" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "stone_material_description" text;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "gable_material_lusa" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "gable_material_marselha" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "mills_data" ADD COLUMN "gable_material_meia_cana" boolean DEFAULT false;