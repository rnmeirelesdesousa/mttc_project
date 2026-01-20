// src/db/schema.ts
import { pgEnum, pgTable, pgSchema, uuid, varchar, text, timestamp, boolean, integer, index, customType, primaryKey, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// ============================================================================
// STEP 1: Define Postgres Enums
// ============================================================================

export const statusEnum = pgEnum('status', ['draft', 'review', 'published']);

export const typologyEnum = pgEnum('typology', [
  'azenha',
  'rodizio',
  'mare',
  'torre_fixa',
  'giratorio',
  'velas',
  'armacao',
]);

export const accessEnum = pgEnum('access', ['pedestrian', 'car', 'difficult_none', 'traditional_track']);

export const legalProtectionEnum = pgEnum('legal_protection', [
  'inexistent',
  'under_study',
  'classified',
]);

export const propertyStatusEnum = pgEnum('property_status', ['private', 'public', 'unknown']);

export const epochEnum = pgEnum('epoch', ['18th_c', '19th_c', '20th_c', 'pre_18th_c']);

export const currentUseEnum = pgEnum('current_use', [
  'milling',
  'housing',
  'tourism',
  'ruin',
  'museum',
]);

export const conservationStateEnum = pgEnum('conservation_state', [
  'very_good',
  'good',
  'reasonable',
  'bad',
  'very_bad_ruin',
]);

// Derived enums based on Portuguese mill architecture (mills_data_spec.md)
export const planShapeEnum = pgEnum('plan_shape', [
  'circular',
  'rectangular',
  'square',
  'polygonal',
  'irregular',
  'circular_tower',
  'quadrangular',
]);

export const volumetryEnum = pgEnum('volumetry', [
  'cylindrical',
  'conical',
  'prismatic_sq_rec',
]);

export const constructionTechniqueEnum = pgEnum('construction_technique', [
  'dry_stone',
  'mortared_stone',
  'mixed_other',
]);

export const exteriorFinishEnum = pgEnum('exterior_finish', [
  'exposed',
  'plastered',
  'whitewashed',
]);

export const roofShapeEnum = pgEnum('roof_shape', [
  'conical',
  'gable',
  'lean_to',
  'inexistent',
  'false_dome',
]);

export const roofMaterialEnum = pgEnum('roof_material', [
  'tile',
  'zinc',
  'thatch',
  'slate',
  'stone',
]);

export const settingEnum = pgEnum('setting', [
  'rural',
  'urban',
  'isolated',
  'riverbank',
]);

// Motive Systems Enums
export const captationTypeEnum = pgEnum('captation_type', [
  'weir',
  'pool',
  'direct',
]);

export const conductionTypeEnum = pgEnum('conduction_type', [
  'levada',
  'modern_pipe',
]);

export const conductionStateEnum = pgEnum('conduction_state', [
  'operational_clean',
  'clogged',
  'damaged_broken',
]);

export const admissionRodizioEnum = pgEnum('admission_rodizio', [
  'cubo',
  'calha',
]);

export const admissionAzenhaEnum = pgEnum('admission_azenha', [
  'calha_superior',
  'canal_inferior',
]);

export const wheelTypeRodizioEnum = pgEnum('wheel_type_rodizio', [
  'penas',
  'colheres',
]);

export const wheelTypeAzenhaEnum = pgEnum('wheel_type_azenha', [
  'copeira',
  'dezio_palas',
]);

export const motiveApparatusEnum = pgEnum('motive_apparatus', [
  'sails',
  'shells',
  'tail',
  'cap',
]);

export const millstoneStateEnum = pgEnum('millstone_state', [
  'complete',
  'disassembled',
  'fragmented',
  'missing',
]);

export const epigraphyLocationEnum = pgEnum('epigraphy_location', [
  'door_jambs',
  'interior_walls',
  'millstones',
  'other',
]);

export const epigraphyTypeEnum = pgEnum('epigraphy_type', [
  'dates',
  'initials',
  'religious_symbols',
  'counting_marks',
]);

// User Roles Enum (Phase 3: Academic Shield)
export const userRoleEnum = pgEnum('user_role', ['public', 'researcher', 'admin']);

// ============================================================================
// STEP 2: Reference to Supabase Auth Schema (Phase 3: Academic Shield)
// ============================================================================

// Reference to Supabase Auth schema (for foreign keys)
const authSchema = pgSchema('auth');
const users = authSchema.table('users', {
	id: uuid('id').primaryKey(),
});

// ============================================================================
// STEP 2.5: PostGIS Geography Point Type
// ============================================================================
// NOTE: Phase 5.9.2 - Custom icons for constructions must be stored in the
// Supabase Storage bucket named 'map-assets'. The customIconUrl field stores
// the public URL to these assets (SVG/PNG format recommended for map markers).
// ============================================================================

// Custom type for PostGIS geography(POINT)
const geographyPoint = customType<{ data: [number, number]; driverData: string }>({
  dataType() {
    return 'geography';
  },
  toDriver(value: [number, number]): string {
    // Convert [lng, lat] to PostGIS POINT format
    return `POINT(${value[0]} ${value[1]})`;
  },
  fromDriver(value: string): [number, number] {
    // FIX: Updated regex to include [-] to handle negative coordinates (Western Hemisphere)
    const match = value.match(/POINT\(([-.\d]+)\s+([-.\d]+)\)/);
    if (match) {
      return [parseFloat(match[1]), parseFloat(match[2])];
    }
    // Fallback/Safety
    return [0,0];
  },
});

// Custom type for PostGIS geometry(LineString, 4326)
// Stores an array of [lng, lat] coordinate pairs representing a water line path
const geometryLineString = customType<{ data: [number, number][]; driverData: string }>({
  dataType() {
    return 'geometry(LineString, 4326)';
  },
  toDriver(value: [number, number][]): string {
    // Convert array of [lng, lat] tuples to PostGIS LINESTRING format
    const coords = value.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
    return `LINESTRING(${coords})`;
  },
  fromDriver(value: string): [number, number][] {
    // Parse PostGIS LINESTRING format: LINESTRING(lng1 lat1, lng2 lat2, ...)
    const match = value.match(/LINESTRING\((.+)\)/);
    if (match) {
      const coordsStr = match[1];
      const coordPairs = coordsStr.split(',').map(coord => coord.trim());
      return coordPairs.map(coord => {
        const [lng, lat] = coord.split(/\s+/).map(parseFloat);
        return [lng, lat] as [number, number];
      });
    }
    // Fallback/Safety
    return [];
  },
});

// ============================================================================
// STEP 2.7: Table `profiles` (Phase 3: Academic Shield)
// ============================================================================

export const profiles = pgTable('profiles', {
	id: uuid('id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	role: userRoleEnum('role').default('public').notNull(),
	fullName: varchar('full_name', { length: 255 }),
	academicAffiliation: varchar('academic_affiliation', { length: 255 }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// STEP 3: Table `constructions` (The Parent)
// ============================================================================

export const constructions = pgTable(
  'constructions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    legacyId: text('legacy_id'), // Original paper inventory code or external reference
    typeCategory: varchar('type_category', { length: 50 }).notNull().default('MILL'),
    geom: geographyPoint('geom').notNull(),
    district: text('district'),
    municipality: text('municipality'),
    parish: text('parish'),
    address: text('address'),
    drainageBasin: text('drainage_basin'),
    mainImage: text('main_image'),
    galleryImages: text('gallery_images').array(),
    // Phase 5.9.2: Custom icon URL for map markers (stored in Supabase Storage bucket 'map-assets')
    customIconUrl: text('custom_icon_url'),
    status: statusEnum('status').notNull().default('draft'),
    // Phase 3: Academic Shield - Audit trail
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      slugIdx: index('constructions_slug_idx').on(table.slug),
    };
  }
);

// ============================================================================
// STEP 4: Table `mills_data` (The Child - 1:1 relationship)
// ============================================================================

export const millsData = pgTable('mills_data', {
  // Primary Key and Foreign Key (1:1 relationship)
  constructionId: uuid('construction_id')
    .primaryKey()
    .references(() => constructions.id, { onDelete: 'cascade' }),

  typology: typologyEnum('typology').notNull(),

  // Geographic attributes
  access: accessEnum('access'),
  legalProtection: legalProtectionEnum('legal_protection'),
  propertyStatus: propertyStatusEnum('property_status'),

  // Characterization
  epoch: epochEnum('epoch'),
  setting: settingEnum('setting'),
  currentUse: currentUseEnum('current_use'),

  // Architecture (Section III)
  planShape: planShapeEnum('plan_shape'),
  volumetry: volumetryEnum('volumetry'),
  constructionTechnique: constructionTechniqueEnum('construction_technique'),
  exteriorFinish: exteriorFinishEnum('exterior_finish'),
  roofShape: roofShapeEnum('roof_shape'),
  roofMaterial: roofMaterialEnum('roof_material'),

  // Motive Systems - Hydraulic (Section IV)
  captationType: captationTypeEnum('captation_type'),
  conductionType: conductionTypeEnum('conduction_type'),
  conductionState: conductionStateEnum('conduction_state'),
  admissionRodizio: admissionRodizioEnum('admission_rodizio'),
  admissionAzenha: admissionAzenhaEnum('admission_azenha'),
  wheelTypeRodizio: wheelTypeRodizioEnum('wheel_type_rodizio'),
  wheelTypeAzenha: wheelTypeAzenhaEnum('wheel_type_azenha'),
  rodizioQty: integer('rodizio_qty'),
  azenhaQty: integer('azenha_qty'),

  // Motive Systems - Wind
  motiveApparatus: motiveApparatusEnum('motive_apparatus'),

  // Grinding Mechanism
  millstoneQuantity: integer('millstone_quantity'),
  millstoneDiameter: text('millstone_diameter'), // Float stored as text for precision
  millstoneState: millstoneStateEnum('millstone_state'),
  hasTremonha: boolean('has_tremonha').default(false),
  hasQuelha: boolean('has_quelha').default(false),
  hasUrreiro: boolean('has_urreiro').default(false),
  hasAliviadouro: boolean('has_aliviadouro').default(false),
  hasFarinaleiro: boolean('has_farinaleiro').default(false),

  // Epigraphy (Section V)
  epigraphyPresence: boolean('epigraphy_presence').default(false),
  epigraphyLocation: epigraphyLocationEnum('epigraphy_location'),
  epigraphyType: epigraphyTypeEnum('epigraphy_type'),
  epigraphyDescription: text('epigraphy_description'),

  // Conservation Ratings (Section VI - Granular)
  ratingStructure: conservationStateEnum('rating_structure'),
  ratingRoof: conservationStateEnum('rating_roof'),
  ratingHydraulic: conservationStateEnum('rating_hydraulic'),
  ratingMechanism: conservationStateEnum('rating_mechanism'),
  ratingOverall: conservationStateEnum('rating_overall'),

  // Annexes (Boolean flags)
  hasOven: boolean('has_oven').default(false),
  hasMillerHouse: boolean('has_miller_house').default(false),
  hasStable: boolean('has_stable').default(false),
  hasFullingMill: boolean('has_fulling_mill').default(false),

  // Phase 5.9.2: Hydraulic Infrastructure - Reference to water line
  waterLineId: uuid('water_line_id').references(() => waterLines.id),

  // Phase 5.9.3.10: Physical Dimensions (meters)
  length: real('length'), // Length in meters (e.g., 5.45m)
  width: real('width'), // Width in meters
  height: real('height'), // Height in meters

  // Data Transition: Stone Material (replacing packed strings in observations)
  stoneTypeGranite: boolean('stone_type_granite').default(false),
  stoneTypeSchist: boolean('stone_type_schist').default(false),
  stoneTypeOther: boolean('stone_type_other').default(false),
  stoneMaterialDescription: text('stone_material_description'),

  // Data Transition: Gable Roof Materials (replacing packed strings in observations)
  gableMaterialLusa: boolean('gable_material_lusa').default(false),
  gableMaterialMarselha: boolean('gable_material_marselha').default(false),
  gableMaterialMeiaCana: boolean('gable_material_meia_cana').default(false),
});

// ============================================================================
// STEP 5: Table `construction_translations` (i18n)
// ============================================================================

export const constructionTranslations = pgTable(
  'construction_translations',
  {
    constructionId: uuid('construction_id')
      .notNull()
      .references(() => constructions.id, { onDelete: 'cascade' }),
    langCode: varchar('lang_code', { length: 2 }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    // Conservation observations (Section VI)
    observationsStructure: text('observations_structure'),
    observationsRoof: text('observations_roof'),
    observationsHydraulic: text('observations_hydraulic'),
    observationsMechanism: text('observations_mechanism'),
    observationsGeneral: text('observations_general'),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.constructionId, table.langCode] }),
    };
  }
);

// ============================================================================
// STEP 5.5: Table `water_lines` (Phase 5.9.2: Hydraulic Infrastructure)
// ============================================================================

export const waterLines = pgTable(
  'water_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Foreign key to constructions (1:1 relationship)
    constructionId: uuid('construction_id')
      .notNull()
      .unique()
      .references(() => constructions.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    path: geometryLineString('path').notNull(), // PostGIS LineString geometry (SRID 4326)
    color: varchar('color', { length: 7 }).notNull().default('#3b82f6'), // Hex color code for map display
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => {
    return {
      slugIdx: index('water_lines_slug_idx').on(table.slug),
    };
  }
);

// ============================================================================
// STEP 5.6: Table `water_line_translations` (Phase 5.9.2: i18n for water lines)
// ============================================================================

export const waterLineTranslations = pgTable(
  'water_line_translations',
  {
    waterLineId: uuid('water_line_id')
      .notNull()
      .references(() => waterLines.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 5 }).notNull(), // e.g., 'pt', 'en', 'pt-BR'
    name: text('name').notNull(),
    description: text('description'),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.waterLineId, table.locale] }),
    };
  }
);

// ============================================================================
// STEP 5.7: Table `pocas_data` (Phase 5.9.7: The Poças Identity)
// ============================================================================

export const pocasData = pgTable('pocas_data', {
  // Primary Key and Foreign Key (1:1 relationship with constructions)
  constructionId: uuid('construction_id')
    .primaryKey()
    .references(() => constructions.id, { onDelete: 'cascade' }),

  // Link to water line (levada)
  waterLineId: uuid('water_line_id')
    .notNull()
    .references(() => waterLines.id, { onDelete: 'restrict' }),
});

// ============================================================================
// STEP 6: Define Relations
// ============================================================================

export const constructionsRelations = relations(constructions, ({ one, many }) => ({
  millsData: one(millsData, {
    fields: [constructions.id],
    references: [millsData.constructionId],
  }),
  pocasData: one(pocasData, {
    fields: [constructions.id],
    references: [pocasData.constructionId],
  }),
  waterLine: one(waterLines, {
    fields: [constructions.id],
    references: [waterLines.constructionId],
  }),
  translations: many(constructionTranslations),
  // Phase 3: Academic Shield - Author relation
  author: one(profiles, {
    fields: [constructions.createdBy],
    references: [profiles.id],
  }),
}));

// Phase 3: Academic Shield - Profiles Relations
export const profilesRelations = relations(profiles, ({ many }) => ({
  // A researcher can author many constructions
  constructions: many(constructions),
}));

export const millsDataRelations = relations(millsData, ({ one }) => ({
  construction: one(constructions, {
    fields: [millsData.constructionId],
    references: [constructions.id],
  }),
  // Phase 5.9.2: Hydraulic Infrastructure relation
  waterLine: one(waterLines, {
    fields: [millsData.waterLineId],
    references: [waterLines.id],
  }),
}));

export const constructionTranslationsRelations = relations(
  constructionTranslations,
  ({ one }) => ({
    construction: one(constructions, {
      fields: [constructionTranslations.constructionId],
      references: [constructions.id],
    }),
  })
);


export const waterLineTranslationsRelations = relations(
  waterLineTranslations,
  ({ one }) => ({
    waterLine: one(waterLines, {
      fields: [waterLineTranslations.waterLineId],
      references: [waterLines.id],
    }),
  })
);

// Phase 5.9.7: Poças Data Relations
export const pocasDataRelations = relations(pocasData, ({ one }) => ({
  construction: one(constructions, {
    fields: [pocasData.constructionId],
    references: [constructions.id],
  }),
  waterLine: one(waterLines, {
    fields: [pocasData.waterLineId],
    references: [waterLines.id],
  }),
}));

// Phase 5.9.7: Update Water Lines Relations to include pocas
export const waterLinesRelations = relations(waterLines, ({ one, many }) => ({
  construction: one(constructions, {
    fields: [waterLines.constructionId],
    references: [constructions.id],
  }),
  translations: many(waterLineTranslations),
  mills: many(millsData),
  pocas: many(pocasData),
}));

// ============================================================================
// Types
// ============================================================================

export type Construction = InferSelectModel<typeof constructions>;
export type NewConstruction = InferInsertModel<typeof constructions>;

export type MillData = InferSelectModel<typeof millsData>;
export type NewMillData = InferInsertModel<typeof millsData>;

export type ConstructionTranslation = InferSelectModel<typeof constructionTranslations>;
export type NewConstructionTranslation = InferInsertModel<typeof constructionTranslations>;

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

export type WaterLine = InferSelectModel<typeof waterLines>;
export type NewWaterLine = InferInsertModel<typeof waterLines>;

export type WaterLineTranslation = InferSelectModel<typeof waterLineTranslations>;
export type NewWaterLineTranslation = InferInsertModel<typeof waterLineTranslations>;

export type PocasData = InferSelectModel<typeof pocasData>;
export type NewPocasData = InferInsertModel<typeof pocasData>;

export const schema = {
  constructions,
  millsData,
  constructionTranslations,
  profiles,
  waterLines,
  waterLineTranslations,
  pocasData,
};