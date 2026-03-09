-- ============================================================
-- POKEDEX CATALOG — Option B (data-driven, canonique)
-- ============================================================

-- 1) Tables catalogue
-- ------------------------------------------------------------
create table if not exists pokedex_brands (
  id         text primary key,
  name       text not null,
  tier       text not null check (tier in ('commun','rare','legendaire')),
  created_at timestamptz default now()
);

create table if not exists pokedex_families (
  id         text primary key,
  brand_id   text not null references pokedex_brands(id) on delete cascade,
  name       text not null,
  sort_order int  default 0,
  created_at timestamptz default now()
);
create index if not exists idx_pokedex_families_brand on pokedex_families(brand_id);

create table if not exists pokedex_models (
  id         text     primary key,
  family_id  text     not null references pokedex_families(id) on delete cascade,
  name       text     not null,
  rarity     text     not null check (rarity in ('commun','rare','epique','legendaire','platine')),
  is_boss    boolean  default false,
  aliases    text[]   not null default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_pokedex_models_family on pokedex_models(family_id);

-- 2) FK sur spots
-- ------------------------------------------------------------
alter table spots add column if not exists pokedex_model_id text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spots_pokedex_model_id_fkey'
  ) then
    alter table spots
      add constraint spots_pokedex_model_id_fkey
      foreign key (pokedex_model_id) references pokedex_models(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_spots_pokedex_model_id on spots(pokedex_model_id);

-- 3) RLS
-- ------------------------------------------------------------
alter table pokedex_brands   enable row level security;
alter table pokedex_families enable row level security;
alter table pokedex_models   enable row level security;

drop policy if exists "read pokedex_brands"   on pokedex_brands;
drop policy if exists "read pokedex_families" on pokedex_families;
drop policy if exists "read pokedex_models"   on pokedex_models;

create policy "read pokedex_brands"   on pokedex_brands   for select to authenticated using (true);
create policy "read pokedex_families" on pokedex_families for select to authenticated using (true);
create policy "read pokedex_models"   on pokedex_models   for select to authenticated using (true);

-- 4) SEEDS — Marques (30)
-- ------------------------------------------------------------
insert into pokedex_brands (id, name, tier) values
  ('toyota',      'Toyota',         'commun'),
  ('volkswagen',  'Volkswagen',      'commun'),
  ('renault',     'Renault',         'commun'),
  ('peugeot',     'Peugeot',         'commun'),
  ('skoda',       'Skoda',           'commun'),
  ('seat',        'SEAT',            'commun'),
  ('dacia',       'Dacia',           'commun'),
  ('fiat',        'Fiat',            'commun'),
  ('ford',        'Ford',            'commun'),
  ('hyundai',     'Hyundai',         'commun'),
  ('kia',         'Kia',             'commun'),
  ('citroen',     'Citroën',         'commun'),
  ('audi',        'Audi',            'rare'),
  ('bmw',         'BMW',             'rare'),
  ('mercedes',    'Mercedes-Benz',   'rare'),
  ('volvo',       'Volvo',           'rare'),
  ('lexus',       'Lexus',           'rare'),
  ('tesla',       'Tesla',           'rare'),
  ('mini',        'MINI',            'rare'),
  ('cupra',       'CUPRA',           'rare'),
  ('land_rover',  'Land Rover',      'rare'),
  ('ds',          'DS Automobiles',  'rare'),
  ('porsche',     'Porsche',         'legendaire'),
  ('ferrari',     'Ferrari',         'legendaire'),
  ('lamborghini', 'Lamborghini',     'legendaire'),
  ('mclaren',     'McLaren',         'legendaire'),
  ('bentley',     'Bentley',         'legendaire'),
  ('rolls_royce', 'Rolls-Royce',     'legendaire'),
  ('bugatti',     'Bugatti',         'legendaire'),
  ('aston_martin','Aston Martin',    'legendaire')
on conflict (id) do nothing;

-- 5) SEEDS — Familles (22)
-- ------------------------------------------------------------
insert into pokedex_families (id, brand_id, name, sort_order) values
  ('audi_a3',       'audi',       'Famille A3',              10),
  ('audi_a4_a5',    'audi',       'Famille A4 / A5',         20),
  ('audi_a6_a7',    'audi',       'Famille A6 / A7',         30),
  ('audi_r8',       'audi',       'R8',                      40),
  ('bmw_serie_1_2', 'bmw',        'Série 1 / 2',             10),
  ('bmw_serie_3_4', 'bmw',        'Série 3 / 4',             20),
  ('bmw_serie_5',   'bmw',        'Série 5',                 30),
  ('bmw_serie_7_8', 'bmw',        'Série 7 / 8',             40),
  ('merc_a_b',      'mercedes',   'Classe A / B',            10),
  ('merc_c',        'mercedes',   'Classe C',                20),
  ('merc_e',        'mercedes',   'Classe E',                30),
  ('merc_g',        'mercedes',   'Classe G',                40),
  ('merc_amg_gt',   'mercedes',   'AMG GT / SL',             50),
  ('vw_golf',       'volkswagen', 'Golf',                    10),
  ('porsche_911',   'porsche',    '911 (Type 992)',           10),
  ('porsche_718',   'porsche',    '718 Cayman / Boxster',    20),
  ('porsche_taycan','porsche',    'Taycan',                  30),
  ('ferrari_v8',    'ferrari',    'V8 (Roma / F8 / Port.)',  10),
  ('ferrari_v12',   'ferrari',    'V12 (812 / Daytona)',     20),
  ('ferrari_hybrid','ferrari',    'Hybride (SF90 / LaF)',    30),
  ('lambo_huracan', 'lamborghini','Huracán',                  10),
  ('lambo_urus',    'lamborghini','Urus',                    20)
on conflict (id) do nothing;

-- 6) SEEDS — Modèles (~75)
-- ------------------------------------------------------------
insert into pokedex_models (id, family_id, name, rarity, is_boss, aliases) values
  -- AUDI A3
  ('audi_a3',     'audi_a3', 'A3',  'commun', false, array['a3','audi a3','a3 sportback','a3 berline','a3 sedan']),
  ('audi_s3',     'audi_a3', 'S3',  'rare',   false, array['s3','audi s3','s3 sportback']),
  ('audi_rs3',    'audi_a3', 'RS3', 'epique', true,  array['rs3','audi rs3','rs3 sportback','rs 3']),
  -- AUDI A4/A5
  ('audi_a4',     'audi_a4_a5', 'A4 / A5',   'commun', false, array['a4','a5','audi a4','audi a5','a4 avant','a5 sportback']),
  ('audi_s4',     'audi_a4_a5', 'S4 / S5',   'rare',   false, array['s4','s5','audi s4','audi s5']),
  ('audi_rs4',    'audi_a4_a5', 'RS4 / RS5', 'epique', true,  array['rs4','rs5','audi rs4','audi rs5','rs4 avant','rs 4','rs 5']),
  -- AUDI A6/A7
  ('audi_a6',     'audi_a6_a7', 'A6 / A7',   'commun', false, array['a6','a7','audi a6','audi a7','a6 avant']),
  ('audi_s6',     'audi_a6_a7', 'S6 / S7',   'rare',   false, array['s6','s7','audi s6','audi s7']),
  ('audi_rs6',    'audi_a6_a7', 'RS6 / RS7', 'legendaire', true, array['rs6','rs7','audi rs6','audi rs7','rs 6','rs 7']),
  -- AUDI R8
  ('audi_r8',     'audi_r8', 'R8 V10',       'legendaire', false, array['r8','audi r8','r8 v10','r8 plus']),
  ('audi_r8_perf','audi_r8', 'R8 Performance','platine',   true,  array['r8 performance','r8 v10 performance','r8 v10+']),
  -- BMW 1/2
  ('bmw_118i',   'bmw_serie_1_2', '118i / 120i', 'commun', false, array['116i','118i','120i','serie 1','1er','bmw 1']),
  ('bmw_m135i',  'bmw_serie_1_2', 'M135i',       'rare',   false, array['m135i','m 135i']),
  ('bmw_220i',   'bmw_serie_1_2', '220i / 220d', 'commun', false, array['218i','220i','218d','220d','serie 2','2er','bmw 2']),
  ('bmw_m240i',  'bmw_serie_1_2', 'M240i',       'rare',   false, array['m235i','m240i','m 240i','m240i xdrive']),
  ('bmw_m2',     'bmw_serie_1_2', 'M2',          'epique', false, array['m2','bmw m2','m2 competition','m2 comp']),
  ('bmw_m2csl',  'bmw_serie_1_2', 'M2 CSL',      'legendaire', true, array['m2 csl','m2 cs']),
  -- BMW 3/4
  ('bmw_320i',   'bmw_serie_3_4', '320i / 420i', 'commun', false, array['316i','318i','320i','330i','320d','418i','420i','serie 3','serie 4','3er','4er','bmw 3','bmw 4']),
  ('bmw_m340i',  'bmw_serie_3_4', 'M340i / M440i','rare',  false, array['m340i','m440i','m 340i','m 440i']),
  ('bmw_m3',     'bmw_serie_3_4', 'M3 / M4',     'epique', false, array['m3','m4','bmw m3','bmw m4','m3 competition','m4 competition']),
  ('bmw_m4csl',  'bmw_serie_3_4', 'M4 CSL',      'legendaire', true, array['m3 cs','m4 csl','m4 cs']),
  -- BMW 5
  ('bmw_520i',   'bmw_serie_5', '520i / 540i', 'commun', false, array['520i','530i','540i','520d','serie 5','5er','bmw 5']),
  ('bmw_m550i',  'bmw_serie_5', 'M550i',       'rare',   false, array['m550i','m 550i']),
  ('bmw_m5',     'bmw_serie_5', 'M5',          'epique', false, array['m5','bmw m5','m5 competition']),
  ('bmw_m5cs',   'bmw_serie_5', 'M5 CS',       'legendaire', true, array['m5 cs','m5cs']),
  -- BMW 7/8
  ('bmw_740i',   'bmw_serie_7_8', '740i',       'rare',   false, array['730i','740i','745e','750i','serie 7','7er','bmw 7']),
  ('bmw_m8',     'bmw_serie_7_8', 'M8',         'epique', false, array['m8','bmw m8','m8 competition','840i']),
  ('bmw_m8gc',   'bmw_serie_7_8', 'M8 Gran Coupé','legendaire', true, array['m8 gran coupe','m8 gc']),
  -- MERCEDES A/B
  ('merc_a180',  'merc_a_b', 'A180 / A200', 'commun', false, array['a180','a200','a class','classe a']),
  ('merc_a35',   'merc_a_b', 'A35 AMG',     'rare',   false, array['a35','a35 amg']),
  ('merc_a45',   'merc_a_b', 'A45 AMG S',   'epique', true,  array['a45','a45s','a45 amg']),
  -- MERCEDES C
  ('merc_c200',  'merc_c', 'C200 / C300', 'commun', false, array['c180','c200','c220','c300','classe c','c class']),
  ('merc_c43',   'merc_c', 'C43 AMG',     'rare',   false, array['c43','c43 amg']),
  ('merc_c63',   'merc_c', 'C63 AMG',     'epique', false, array['c63','c63 amg','c63s']),
  ('merc_c63ep', 'merc_c', 'C63 E-Performance','legendaire', true, array['c63 e performance','c63 ep']),
  -- MERCEDES E
  ('merc_e220',  'merc_e', 'E220 / E300', 'commun', false, array['e200','e220','e300','classe e','e class']),
  ('merc_e53',   'merc_e', 'E53 AMG',     'rare',   false, array['e53','e53 amg']),
  ('merc_e63',   'merc_e', 'E63 AMG S',   'legendaire', true, array['e63','e63 amg','e63s']),
  -- MERCEDES G
  ('merc_g350',  'merc_g', 'G350d',    'rare',      false, array['g350','g400','classe g','g class','g350d']),
  ('merc_g63',   'merc_g', 'G63 AMG',  'legendaire', true,  array['g63','g63 amg']),
  -- MERCEDES AMG GT
  ('merc_amggt43','merc_amg_gt','AMG GT43 / GT53','epique',    false, array['amg gt43','amg gt53','gt43','gt53','sl43']),
  ('merc_amggt63','merc_amg_gt','AMG GT63 S',    'legendaire', false, array['gt63','gt63s','amg gt63','sl63']),
  ('merc_amggtbs','merc_amg_gt','AMG GT Black Series','platine',true, array['gt black series','amg gt black']),
  -- VW GOLF
  ('vw_golf',    'vw_golf', 'Golf TSI / TDI','commun', false, array['golf','vw golf','golf 8','golf tsi','golf tdi']),
  ('vw_golf_gti','vw_golf', 'Golf GTI',      'rare',   false, array['golf gti','gti','golf gti performance','gti clubsport']),
  ('vw_golf_r',  'vw_golf', 'Golf R',        'epique', true,  array['golf r','vw golf r','golf r 333']),
  -- PORSCHE 911
  ('por_911c',   'porsche_911', 'Carrera / Targa','rare',      false, array['carrera','911 carrera','targa','911','porsche 911','911s','carrera 4s']),
  ('por_911gts', 'porsche_911', '911 GTS / Turbo','legendaire',false, array['911 gts','gts','turbo','911 turbo','turbo s']),
  ('por_911gt3', 'porsche_911', 'GT3',             'legendaire',false, array['gt3','911 gt3','gt3 touring']),
  ('por_911gt3rs','porsche_911','GT3 RS / GT2 RS', 'platine',  true,  array['gt3 rs','gt2 rs','911 gt3 rs','911 gt2 rs']),
  -- PORSCHE 718
  ('por_718',    'porsche_718', 'Cayman / Boxster',   'rare',      false, array['cayman','boxster','718','718 cayman','718 boxster','718s']),
  ('por_718gt4', 'porsche_718', 'GT4 / Spyder',       'legendaire', true,  array['cayman gt4','718 gt4','spyder','718 spyder','gt4 rs']),
  -- PORSCHE TAYCAN
  ('por_taycan',    'porsche_taycan','Taycan 4S',      'epique',  false, array['taycan','taycan 4s','taycan 4']),
  ('por_taycan_ts', 'porsche_taycan','Taycan Turbo S', 'platine', true,  array['taycan turbo','taycan turbo s','taycan turbo gt']),
  -- FERRARI V8
  ('fer_roma',   'ferrari_v8', 'Roma / Spider',  'legendaire', false, array['roma','ferrari roma','roma spider']),
  ('fer_f8',     'ferrari_v8', 'F8 Tributo',     'legendaire', false, array['f8','f8 tributo','f8 spider']),
  ('fer_portofino','ferrari_v8','Portofino M',   'legendaire', false, array['portofino','portofino m']),
  -- FERRARI V12
  ('fer_812',    'ferrari_v12', '812 Superfast / GTS','platine', false, array['812','812 superfast','812 gts','812 competizione']),
  ('fer_daytona','ferrari_v12', 'Daytona SP3',       'platine', true,  array['daytona','daytona sp3']),
  -- FERRARI HYBRIDE
  ('fer_sf90',   'ferrari_hybrid','SF90 Stradale',  'platine', false, array['sf90','sf90 stradale','sf90 spider']),
  ('fer_laf',    'ferrari_hybrid','LaFerrari',      'platine', true,  array['laferrari','la ferrari']),
  -- LAMBORGHINI HURACAN
  ('lam_huracan','lambo_huracan','Huracán Evo',     'legendaire', false, array['huracan','huracán','huracan evo']),
  ('lam_sto',    'lambo_huracan','Huracán STO',     'platine',    false, array['huracan sto','sto']),
  ('lam_sterrato','lambo_huracan','Huracán Sterrato','legendaire', false, array['sterrato','huracan sterrato']),
  ('lam_tecnica','lambo_huracan','Huracán Tecnica', 'legendaire', true,  array['tecnica','huracan tecnica','huracán tecnica']),
  -- LAMBORGHINI URUS
  ('lam_urus',   'lambo_urus', 'Urus',            'legendaire', false, array['urus','lamborghini urus']),
  ('lam_urus_p', 'lambo_urus', 'Urus Performante','platine',    true,  array['urus performante','urus s','urus perf'])
on conflict (id) do nothing;
