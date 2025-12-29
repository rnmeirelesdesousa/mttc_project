📝 Data Specification: Portuguese Molinological Inventory
Source: "Ficha de Inventário - Património Molinológico"
Target: Database Schema for mills_data and Taxonomy Tables.
1. Location & Identity (Augmenting constructions table) [I. IDENTIFICAÇÃO E LOCALIZAÇÃO]
Designation (Designação): Primary Name. Maps to title in construction_translations.
Legacy ID (ID/Código): Text field. Stores the original paper inventory code or other external references.
Administrative Location:
District (Distrito): Text/Enum.
Municipality (Concelho): Text/Enum.
Parish (Freguesia): Text.
Address Details:
Place (Lugar): Text.
Street/Route (Via): Text.
Coordinates(Coordenadas): Maps to geom (PostGIS Point). Source format is GPS.
Drainage Basin (Bacia Hidrográfica): Text field (rio, ribeira).
Access: Enum
pedestrian, 
car, 
difficult/none.
Legal Protection: Enum 
inexistent, 
under_study, 
classified.
Property Status: Enum 
private, 
public, 
unknown.
* we should also have audit columns for creation_date, creation_user and registry_no
2. Characterization (Augmenting mills_data table) [II. CARACTERIZAÇÃO GERAL E HISTÓRICA]
Typology (Strict Enum):
Hydraulic - azenha, rodizio, mare.
Wind - torre_fixa, giratorio, velas, armacao.
Epoch: Enum or String 
18th_c, 
19th_c, 
20th_c, 
*possibility to add more.
Setting: Enum 
rural, 
urban, 
isolated, 
milling_cluster.
Current Use: Enum 
milling [moagem], 
housing [habitação], 
tourism, 
ruin, 
museum.
3. Architecture (New Columns/Tables) [III. ARQUITETURA E ESTRUTURA]
Plan Shape: Enum 
circular_tower, 
quadrangular, 
rectangular, 
irregular.
Volumetry: Enum 
cylindrical, 
conical, 
prismatic_sq_rec [prismático - quadrado/rectang.].
Construction Technique: Enum 
dry_stone, 
mortared_stone, 
mixed_other.
Exterior Finish: Enum 
exposed [Pedra à Vista - Aparelho visível], 
plastered [Rebocado - Cimento/Cal], 
whitewashed [Caiado - Pintado a cal branca].
Roof:
Shape: Enum
conical, 
gable (duas águas), 
lean_to (uma água), 
inexistent.
Material: Enum
tile (telha), 
zinc (zinco), 
thatch (colmo/mato), 
slate (lousa/xisto).
Annexes: Boolean flags or Junction Table 
miller_house [casa do moleiro], 
oven [forno], 
stable [estrebaria], 
fulling_mill [pisão].
4. Motive Systems (Complex Logic) [IV. SISTEMAS MOTRIZES (Hidráulico / Eólico)]
Hydraulic Specifics:
Captation: Enum
weir (açude - represa no rio), 
pool (poça - reservatório), 
direct (captação direta - sem açude).
Conduction:
Type: Enum
levada (canal em terra/pedra), 
modern_pipe (tubagem moderna).
State: Enum
operational_clean (Limpa/Operacional), 
clogged (obstruída - mato/terra), 
damaged_broken (destruída/rompida)
Admission: 
Rodízio - horizontal: Enum
cubo (torre de pedra fechada - pressão), 
calha (calha/caleira - canal aberto inclinado - queda).
Azenha - vertical: Enum
calha_superior (Leva água ao topo da roda), 
canal_inferior (Água passa por baixo).
Wheel Type (Tipo de Roda Motriz - Propulsão): 
Rodízio - horizontal: Enum
penas(madeira), 
colheres (metal/madeira); 
Azenha - vertical: Enum
copeira (por cima), 
dezio_palas (por baixo).
Quantity:
Rodízios: Integer
Rodas de azenha: Integer
Wind Specifics:
Motor Apparatus: Enum
sails (mastro e velas - pano), 
shells (armação/búzios), 
tail (rabo - orientação), 
cap (capelo).
Grinding Mechanism:
Millstones: 
quantity_of_pairs: Integer, 
diameter: Float.
State: Enum
complete, 
disassembled, 
fragmented, 
missing.
Components:  Boolean flags
tremonha, 
quelha, 
urreiro, 
aliviadouro, 
farinaleiro.
5. Epigraphy [V. GRAFITOS E INSCRIÇÕES (Epigrafia)]
Presence: Boolean.
Location: Enum
door_jambs (ombreiras da porta), 
interior_walls (paredes interiores), 
millstones (mos), 
other *possibility to add new data.
Type: Enum
dates, 
initials (iniciais/nomes), 
religious_symbols (simbolos religiosos - cruzes), 
counting_marks (contas de farinha).
Description: text to explain the epigraphy
6. Conservation Rating (Granular)
Instead of one "State", we rate components (VG - very_good [MB - muito_bom], G - good [B - bom], R - reasonable [R - razoavel], B - bad [M - mau], VB - very_bad_ruin [MM - muito mau ruina]):
Structure (Walls) - rate string, observations/pathologies text.
Roof - rate string, observations/pathologies text.
Hydraulic System - rate string, observations/pathologies text.
Mechanism (Millstones) - rate string, observations/pathologies text.
General State - rate string, observations/pathologies text.
