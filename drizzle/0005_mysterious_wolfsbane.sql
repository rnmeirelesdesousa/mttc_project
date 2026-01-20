CREATE TABLE "pocas_data" (
	"construction_id" uuid PRIMARY KEY NOT NULL,
	"water_line_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pocas_data" ADD CONSTRAINT "pocas_data_construction_id_constructions_id_fk" FOREIGN KEY ("construction_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pocas_data" ADD CONSTRAINT "pocas_data_water_line_id_water_lines_id_fk" FOREIGN KEY ("water_line_id") REFERENCES "public"."water_lines"("id") ON DELETE restrict ON UPDATE no action;