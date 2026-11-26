export type HeroClass = 'warrior' | 'mage' | 'archer' | 'assassin' | 'paladin';
export type MapId =
  | 'vale_eldoria'
  | 'floresta_sombria'
  | 'acampamento_orc'
  | 'ruinas_antigas'
  | 'deserto_escaravelho'
  | 'santuario_golem'
  | 'pico_gelido'
  | 'abismo_eterno'
  | 'cidadela_celestial'
  | 'torre_eterna';

export interface MapDef {
  id: MapId;
  name: string;
  subtitle: string;
  spawn: { x: number; y: number };
  recommendedLv: string;
  themeColor: string;
}

export const MAPS: Record<MapId, MapDef> = {
  vale_eldoria: {
    id: 'vale_eldoria',
    name: 'Vale de Eldoria',
    subtitle: 'Praça Segura & Bosques',
    spawn: { x: 24, y: 24 },
    recommendedLv: 'Lv. 1–8',
    themeColor: '#22c55e',
  },
  floresta_sombria: {
    id: 'floresta_sombria',
    name: 'Bosque Crepuscular',
    subtitle: 'Névoa, Teias & Espectros',
    spawn: { x: 24, y: 26 },
    recommendedLv: 'Lv. 8–18',
    themeColor: '#10b981',
  },
  acampamento_orc: {
    id: 'acampamento_orc',
    name: 'Terras de Krag',
    subtitle: 'Cânion & Acampamento Orc',
    spawn: { x: 24, y: 24 },
    recommendedLv: 'Lv. 16–30',
    themeColor: '#84cc16',
  },
  ruinas_antigas: {
    id: 'ruinas_antigas',
    name: 'Cripta dos Antigos',
    subtitle: 'Tumbas & Lich Imortal',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 28–38',
    themeColor: '#60a5fa',
  },
  deserto_escaravelho: {
    id: 'deserto_escaravelho',
    name: 'Dunas de Solari',
    subtitle: 'Areias Douradas & Colosso',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 36–48',
    themeColor: '#eab308',
  },
  santuario_golem: {
    id: 'santuario_golem',
    name: 'Santuário Vulcânico',
    subtitle: 'Fortaleza do Golem Ancestral',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 46–60',
    themeColor: '#f59e0b',
  },
  pico_gelido: {
    id: 'pico_gelido',
    name: 'Pico Glacial',
    subtitle: 'Geleira & Dragão de Gelo',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 58–80',
    themeColor: '#38bdf8',
  },
  abismo_eterno: {
    id: 'abismo_eterno',
    name: 'Abismo Eterno',
    subtitle: 'Trono do Senhor do Abismo',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 78–105',
    themeColor: '#f43f5e',
  },
  cidadela_celestial: {
    id: 'cidadela_celestial',
    name: 'Cidadela Celestial',
    subtitle: 'Ruínas Astrais & Serafins',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 100–140',
    themeColor: '#fde047',
  },
  torre_eterna: {
    id: 'torre_eterna',
    name: 'Torre da Eternidade',
    subtitle: 'Endgame Supremo (Imperador)',
    spawn: { x: 24, y: 28 },
    recommendedLv: 'Lv. 135–200+',
    themeColor: '#c084fc',
  },
};
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type EquipSlot = 'weapon' | 'armor' | 'helm' | 'gloves' | 'boots' | 'cloak' | 'amulet' | 'ring' | 'ring2' | 'mount';
export type ItemKind = 'equip' | 'potion_hp' | 'potion_mp' | 'material' | 'buff';
export type ItemIconKey = 'sword' | 'staff' | 'armor' | 'helm' | 'gloves' | 'boots' | 'cloak' | 'amulet' | 'ring' | 'mount' | 'pot_hp' | 'pot_mp' | 'mat' | 'elixir';

export interface SkillDef {
  id: string;
  name: string;
  heroClass: HeroClass;
  cooldownMs: number;
  mpCost: number;
  range: number;
  damageMult: number;
  aoeRadius: number;
  color: string;
  description: string;
}

export interface ClassDef {
  id: HeroClass;
  name: string;
  baseHp: number;
  baseMp: number;
  baseAtk: number;
  baseDef: number;
  moveSpeed: number;
  color: number;
}

export interface MonsterTemplate {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  xpReward: number;
  goldMin: number;
  goldMax: number;
  isBoss?: boolean;
  color: number;
  scale: number;
  aggroRange: number;
  respawnMs: number;
  modelId?: string;
  tint?: number;
  dropPool?: string[];
}

export interface ItemTemplate {
  id: string;
  name: string;
  kind: ItemKind;
  slot?: EquipSlot;
  rarity: Rarity;
  iconKey?: ItemIconKey;
  atkBonus?: number;
  defBonus?: number;
  hpBonus?: number;
  mpBonus?: number;
  critBonus?: number;
  speedBonus?: number;
  lifestealBonus?: number;
  critDmgBonus?: number;
  cdrBonus?: number;
  bossDmgBonus?: number;
  thornsPct?: number;
  procLightning?: number;
  effectDesc?: string;
  restoreAmount?: number;
  buffEffect?: {
    name: string;
    durationMs: number;
    atkPct?: number;
    xpBonus?: number;
    goldBonus?: number;
    critChance?: number;
    critDmg?: number;
  };
}

export interface QuestTemplate {
  id: string;
  title: string;
  targetMonsterId: string;
  requiredCount: number;
  xpReward: number;
  goldReward: number;
  zoneCenter: { x: number; y: number };
  repeatable?: boolean;
}

export const RARITY_META: Record<Rarity, { label: string; color: string; order: number; powerMult: number; maxAffixes: number }> = {
  common: { label: 'Comum', color: '#9ca3af', order: 0, powerMult: 1.0, maxAffixes: 2 },
  uncommon: { label: 'Incomum', color: '#4ade80', order: 1, powerMult: 1.08, maxAffixes: 3 },
  rare: { label: 'Raro', color: '#60a5fa', order: 2, powerMult: 1.18, maxAffixes: 4 },
  epic: { label: 'Épico', color: '#c084fc', order: 3, powerMult: 1.32, maxAffixes: 5 },
  legendary: { label: 'Lendário', color: '#fbbf24', order: 4, powerMult: 1.50, maxAffixes: 6 },
  mythic: { label: 'Mítico', color: '#f43f5e', order: 5, powerMult: 1.75, maxAffixes: 7 },
};

export type AffixKey =
  | 'atk'
  | 'def'
  | 'hp'
  | 'mp'
  | 'critChance'
  | 'critDmg'
  | 'lifesteal'
  | 'cdr'
  | 'bossDmg'
  | 'speed'
  | 'thorns'
  | 'xpBonus'
  | 'goldBonus';

const AFFIX_POOL: AffixKey[] = [
  'atk',
  'def',
  'hp',
  'mp',
  'critChance',
  'critDmg',
  'lifesteal',
  'cdr',
  'bossDmg',
  'speed',
  'thorns',
  'xpBonus',
  'goldBonus',
];

export function rollItemAffixes(tpl: ItemTemplate): Record<string, number> {
  if (tpl.kind !== 'equip') return {};
  const meta = RARITY_META[tpl.rarity];
  const count = meta.maxAffixes;
  const tierScale = 1 + meta.order * 0.65;
  const pool = [...AFFIX_POOL];
  const out: Record<string, number> = {};

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const key = pool.splice(idx, 1)[0];
    const rand = 0.75 + Math.random() * 0.5;
    switch (key) {
      case 'atk':
        out.atk = Math.max(2, Math.round(4 * tierScale * rand));
        break;
      case 'def':
        out.def = Math.max(2, Math.round(3 * tierScale * rand));
        break;
      case 'hp':
        out.hp = Math.max(15, Math.round(28 * tierScale * rand));
        break;
      case 'mp':
        out.mp = Math.max(10, Math.round(18 * tierScale * rand));
        break;
      case 'critChance':
        out.critChance = Number((0.015 * tierScale * rand).toFixed(3));
        break;
      case 'critDmg':
        out.critDmg = Number((0.04 * tierScale * rand).toFixed(3));
        break;
      case 'lifesteal':
        out.lifesteal = Number((0.008 * tierScale * rand).toFixed(3));
        break;
      case 'cdr':
        out.cdr = Number((0.018 * tierScale * rand).toFixed(3));
        break;
      case 'bossDmg':
        out.bossDmg = Number((0.035 * tierScale * rand).toFixed(3));
        break;
      case 'speed':
        out.speed = Number((0.02 * tierScale * rand).toFixed(3));
        break;
      case 'thorns':
        out.thorns = Number((0.03 * tierScale * rand).toFixed(3));
        break;
      case 'xpBonus':
        out.xpBonus = Number((0.04 * tierScale * rand).toFixed(3));
        break;
      case 'goldBonus':
        out.goldBonus = Number((0.05 * tierScale * rand).toFixed(3));
        break;
    }
  }
  return out;
}

export function getItemStatMult(rarity: Rarity, upgradeLevel = 0): number {
  return RARITY_META[rarity].powerMult * (1 + Math.max(0, upgradeLevel) * 0.14);
}

export function getItemCombatPower(tpl: ItemTemplate, upgradeLevel = 0, affixes: Record<string, number> = {}): number {
  if (tpl.kind !== 'equip') return 0;
  const m = getItemStatMult(tpl.rarity, upgradeLevel);
  return Math.floor(
    ((tpl.atkBonus ?? 0) * m + (affixes.atk ?? 0)) * 4.5 +
      ((tpl.defBonus ?? 0) * m + (affixes.def ?? 0)) * 3.2 +
      ((tpl.hpBonus ?? 0) * m + (affixes.hp ?? 0)) * 0.4 +
      ((tpl.mpBonus ?? 0) * m + (affixes.mp ?? 0)) * 0.2 +
      ((tpl.critBonus ?? 0) + (affixes.critChance ?? 0)) * 500 +
      ((tpl.bossDmgBonus ?? 0) + (affixes.bossDmg ?? 0)) * 400 +
      ((tpl.critDmgBonus ?? 0) + (affixes.critDmg ?? 0)) * 250 +
      ((tpl.lifestealBonus ?? 0) + (affixes.lifesteal ?? 0)) * 1800
  );
}

export function getPowerTier(cp: number): { title: string; color: string; auraHex: number } {
  if (cp >= 25000) return { title: 'Semideus Mítico', color: '#f43f5e', auraHex: 0xf43f5e };
  if (cp >= 8000) return { title: 'Soberano Lendário', color: '#fbbf24', auraHex: 0xfbbf24 };
  if (cp >= 2500) return { title: 'Campeão Épico', color: '#c084fc', auraHex: 0xc084fc };
  if (cp >= 800) return { title: 'Guerreiro Temperado', color: '#60a5fa', auraHex: 0x38bdf8 };
  return { title: 'Aventureiro', color: '#e2e8f0', auraHex: 0xfbbf24 };
}

export const CLASS_DEFS: Record<HeroClass, ClassDef> = {
  warrior: {
    id: 'warrior',
    name: 'Guerreiro',
    baseHp: 240,
    baseMp: 90,
    baseAtk: 24,
    baseDef: 12,
    moveSpeed: 4.4,
    color: 0xe11d48,
  },
  mage: {
    id: 'mage',
    name: 'Mago',
    baseHp: 170,
    baseMp: 160,
    baseAtk: 30,
    baseDef: 7,
    moveSpeed: 4.2,
    color: 0x3b82f6,
  },
  archer: {
    id: 'archer',
    name: 'Arqueiro',
    baseHp: 195,
    baseMp: 115,
    baseAtk: 27,
    baseDef: 8,
    moveSpeed: 4.8,
    color: 0x10b981,
  },
  assassin: {
    id: 'assassin',
    name: 'Assassino',
    baseHp: 185,
    baseMp: 105,
    baseAtk: 31,
    baseDef: 8,
    moveSpeed: 5.1,
    color: 0x8b5cf6,
  },
  paladin: {
    id: 'paladin',
    name: 'Paladino',
    baseHp: 260,
    baseMp: 125,
    baseAtk: 22,
    baseDef: 15,
    moveSpeed: 4.3,
    color: 0xf59e0b,
  },
};

export const SKILLS: SkillDef[] = [
  // Warrior
  {
    id: 'w_slash',
    name: 'Corte Rápido',
    heroClass: 'warrior',
    cooldownMs: 700,
    mpCost: 0,
    range: 1.9,
    damageMult: 1.0,
    aoeRadius: 0,
    color: '#f43f5e',
    description: 'Golpe corpo-a-corpo rápido sem custo de MP.',
  },
  {
    id: 'w_whirl',
    name: 'Turbilhão',
    heroClass: 'warrior',
    cooldownMs: 3200,
    mpCost: 14,
    range: 2.1,
    damageMult: 1.45,
    aoeRadius: 2.4,
    color: '#fb923c',
    description: 'Ataque giratório que atinge todos os inimigos ao redor.',
  },
  {
    id: 'w_crush',
    name: 'Golpe Sísmico',
    heroClass: 'warrior',
    cooldownMs: 5500,
    mpCost: 22,
    range: 2.3,
    damageMult: 2.1,
    aoeRadius: 1.5,
    color: '#facc15',
    description: 'Impacto pesado de alto dano.',
  },
  {
    id: 'w_fury',
    name: 'Ira do Titã',
    heroClass: 'warrior',
    cooldownMs: 9000,
    mpCost: 30,
    range: 2.4,
    damageMult: 2.8,
    aoeRadius: 2.8,
    color: '#ef4444',
    description: 'Skill suprema com explosão de área devastadora.',
  },
  {
    id: 'w_cleave',
    name: 'Fenda Brutal',
    heroClass: 'warrior',
    cooldownMs: 4200,
    mpCost: 16,
    range: 2.3,
    damageMult: 1.85,
    aoeRadius: 2.0,
    color: '#fb7185',
    description: 'Corte frontal amplo que rompe armaduras.',
  },
  {
    id: 'w_execute',
    name: 'Executar Titã',
    heroClass: 'warrior',
    cooldownMs: 11500,
    mpCost: 35,
    range: 2.5,
    damageMult: 3.35,
    aoeRadius: 0,
    color: '#dc2626',
    description: 'Golpe finalizador de alvo único com dano massivo.',
  },
  // Mage
  {
    id: 'm_bolt',
    name: 'Seta Arcana',
    heroClass: 'mage',
    cooldownMs: 750,
    mpCost: 0,
    range: 5.5,
    damageMult: 1.0,
    aoeRadius: 0,
    color: '#60a5fa',
    description: 'Projétil mágico à distância sem custo de MP.',
  },
  {
    id: 'm_nova',
    name: 'Nova Gélida',
    heroClass: 'mage',
    cooldownMs: 3600,
    mpCost: 18,
    range: 5.2,
    damageMult: 1.5,
    aoeRadius: 2.6,
    color: '#38bdf8',
    description: 'Explosão arcana em área ao redor do alvo.',
  },
  {
    id: 'm_meteor',
    name: 'Meteoro',
    heroClass: 'mage',
    cooldownMs: 6000,
    mpCost: 28,
    range: 5.8,
    damageMult: 2.3,
    aoeRadius: 2.2,
    color: '#f97316',
    description: 'Invoca um meteoro de fogo com alto dano.',
  },
  {
    id: 'm_storm',
    name: 'Tempestade',
    heroClass: 'mage',
    cooldownMs: 9500,
    mpCost: 40,
    range: 5.8,
    damageMult: 3.0,
    aoeRadius: 3.2,
    color: '#a855f7',
    description: 'Tempestade elemental suprema em grande área.',
  },
  {
    id: 'm_chain',
    name: 'Raio Encadeado',
    heroClass: 'mage',
    cooldownMs: 4400,
    mpCost: 20,
    range: 5.8,
    damageMult: 1.9,
    aoeRadius: 2.4,
    color: '#38bdf8',
    description: 'Descarga elétrica que salta entre inimigos próximos.',
  },
  {
    id: 'm_singularity',
    name: 'Singularidade',
    heroClass: 'mage',
    cooldownMs: 12000,
    mpCost: 48,
    range: 6.0,
    damageMult: 3.55,
    aoeRadius: 3.5,
    color: '#818cf8',
    description: 'Colapso gravitacional arcano de destruição total.',
  },
  // Archer
  {
    id: 'a_shot',
    name: 'Disparo Rápido',
    heroClass: 'archer',
    cooldownMs: 650,
    mpCost: 0,
    range: 6.0,
    damageMult: 0.98,
    aoeRadius: 0,
    color: '#10b981',
    description: 'Flecha precisa de longo alcance sem custo de MP.',
  },
  {
    id: 'a_volley',
    name: 'Chuva de Flechas',
    heroClass: 'archer',
    cooldownMs: 3400,
    mpCost: 16,
    range: 5.8,
    damageMult: 1.5,
    aoeRadius: 2.5,
    color: '#34d399',
    description: 'Dispara uma saraivada em área sobre os inimigos.',
  },
  {
    id: 'a_pierce',
    name: 'Flecha Perfurante',
    heroClass: 'archer',
    cooldownMs: 5200,
    mpCost: 22,
    range: 6.4,
    damageMult: 2.25,
    aoeRadius: 0,
    color: '#2dd4bf',
    description: 'Tiro concentrado com alto potencial crítico.',
  },
  {
    id: 'a_phoenix',
    name: 'Flecha Fênix',
    heroClass: 'archer',
    cooldownMs: 8800,
    mpCost: 32,
    range: 6.4,
    damageMult: 2.9,
    aoeRadius: 2.8,
    color: '#fb923c',
    description: 'Disparo flamejante supremo que explode ao impacto.',
  },
  {
    id: 'a_snipe',
    name: 'Tiro Letal',
    heroClass: 'archer',
    cooldownMs: 4200,
    mpCost: 18,
    range: 6.8,
    damageMult: 2.05,
    aoeRadius: 0,
    color: '#22c55e',
    description: 'Disparo de precisão extrema à distância máxima.',
  },
  {
    id: 'a_tempest',
    name: 'Vendaval',
    heroClass: 'archer',
    cooldownMs: 11000,
    mpCost: 36,
    range: 6.4,
    damageMult: 3.3,
    aoeRadius: 3.4,
    color: '#4ade80',
    description: 'Tornado de flechas cortantes em área.',
  },
  // Assassin
  {
    id: 's_stab',
    name: 'Corte Duplo',
    heroClass: 'assassin',
    cooldownMs: 550,
    mpCost: 0,
    range: 1.8,
    damageMult: 1.02,
    aoeRadius: 0,
    color: '#a78bfa',
    description: 'Ataque veloz com adagas gêmeas.',
  },
  {
    id: 's_fan',
    name: 'Leque Sombrio',
    heroClass: 'assassin',
    cooldownMs: 3000,
    mpCost: 14,
    range: 2.4,
    damageMult: 1.55,
    aoeRadius: 2.3,
    color: '#8b5cf6',
    description: 'Arremessa lâminas sombrias ao redor.',
  },
  {
    id: 's_ambush',
    name: 'Execução',
    heroClass: 'assassin',
    cooldownMs: 4800,
    mpCost: 22,
    range: 2.2,
    damageMult: 2.45,
    aoeRadius: 0,
    color: '#c084fc',
    description: 'Golpe letal focado em dano explosivo.',
  },
  {
    id: 's_phantom',
    name: 'Dança Fantasma',
    heroClass: 'assassin',
    cooldownMs: 8500,
    mpCost: 30,
    range: 2.5,
    damageMult: 3.1,
    aoeRadius: 2.6,
    color: '#e879f9',
    description: 'Sequência sombria suprema em área.',
  },
  {
    id: 's_shadow_strike',
    name: 'Lâmina Oculta',
    heroClass: 'assassin',
    cooldownMs: 3800,
    mpCost: 16,
    range: 2.4,
    damageMult: 1.95,
    aoeRadius: 0,
    color: '#a855f7',
    description: 'Estocada furtiva nas costas do alvo.',
  },
  {
    id: 's_lotus',
    name: 'Lótus Carmesim',
    heroClass: 'assassin',
    cooldownMs: 11200,
    mpCost: 36,
    range: 2.6,
    damageMult: 3.45,
    aoeRadius: 3.0,
    color: '#f43f5e',
    description: 'Explosão de lâminas sombrias em círculo mortal.',
  },
  // Paladin
  {
    id: 'p_smite',
    name: 'Golpe Sagrado',
    heroClass: 'paladin',
    cooldownMs: 750,
    mpCost: 0,
    range: 2.0,
    damageMult: 1.0,
    aoeRadius: 0,
    color: '#fbbf24',
    description: 'Martelada imbuída de luz sagrada.',
  },
  {
    id: 'p_consecrate',
    name: 'Consagração',
    heroClass: 'paladin',
    cooldownMs: 3600,
    mpCost: 16,
    range: 2.2,
    damageMult: 1.45,
    aoeRadius: 2.8,
    color: '#fcd34d',
    description: 'Solo sagrado que queima todos os inimigos próximos.',
  },
  {
    id: 'p_hammer',
    name: 'Martelo da Justiça',
    heroClass: 'paladin',
    cooldownMs: 5500,
    mpCost: 22,
    range: 3.5,
    damageMult: 2.15,
    aoeRadius: 1.4,
    color: '#f59e0b',
    description: 'Arremessa um martelo divino de impacto pesado.',
  },
  {
    id: 'p_wrath',
    name: 'Julgamento Divino',
    heroClass: 'paladin',
    cooldownMs: 9200,
    mpCost: 34,
    range: 2.6,
    damageMult: 2.85,
    aoeRadius: 3.2,
    color: '#fef08a',
    description: 'Explosão celestial suprema de luz.',
  },
  {
    id: 'p_aegis',
    name: 'Égide Solar',
    heroClass: 'paladin',
    cooldownMs: 4500,
    mpCost: 18,
    range: 2.4,
    damageMult: 1.85,
    aoeRadius: 2.5,
    color: '#fbbf24',
    description: 'Onda de choque com o escudo sagrado.',
  },
  {
    id: 'p_spear',
    name: 'Lança Celestial',
    heroClass: 'paladin',
    cooldownMs: 11500,
    mpCost: 38,
    range: 4.0,
    damageMult: 3.4,
    aoeRadius: 2.6,
    color: '#fde047',
    description: 'Lança de luz pura que perfura os céus.',
  },
];

export const MONSTER_TEMPLATES: Record<string, MonsterTemplate> = {
  slime: {
    id: 'slime',
    name: 'Slime Esmeralda',
    level: 1,
    maxHp: 75,
    atk: 9,
    def: 2,
    speed: 2.1,
    xpReward: 24,
    goldMin: 8,
    goldMax: 16,
    color: 0x22c55e,
    scale: 0.85,
    aggroRange: 3.5,
    respawnMs: 5000,
    modelId: 'slime',
    dropPool: ['pot_hp_small', 'pot_mp_small', 'sword_iron', 'armor_leather', 'gloves_leather'],
  },
  wolf: {
    id: 'wolf',
    name: 'Lobo Cinzento',
    level: 4,
    maxHp: 145,
    atk: 16,
    def: 5,
    speed: 3.0,
    xpReward: 48,
    goldMin: 16,
    goldMax: 30,
    color: 0x94a3b8,
    scale: 1.0,
    aggroRange: 4.2,
    respawnMs: 6500,
    modelId: 'wolf',
    dropPool: ['pot_hp_small', 'sword_steel', 'staff_oak', 'helm_iron', 'boots_swift'],
  },
  spider: {
    id: 'spider',
    name: 'Aranha Sombria',
    level: 9,
    maxHp: 240,
    atk: 23,
    def: 7,
    speed: 3.1,
    xpReward: 82,
    goldMin: 28,
    goldMax: 48,
    color: 0xa855f7,
    scale: 1.05,
    aggroRange: 4.5,
    respawnMs: 6500,
    modelId: 'spider',
    dropPool: ['pot_hp_med', 'pot_mp_med', 'sword_steel', 'staff_oak', 'boots_swift', 'gloves_scout'],
  },
  wraith: {
    id: 'wraith',
    name: 'Espectro da Névoa',
    level: 14,
    maxHp: 360,
    atk: 31,
    def: 10,
    speed: 2.8,
    xpReward: 125,
    goldMin: 42,
    goldMax: 72,
    color: 0x38bdf8,
    scale: 1.15,
    aggroRange: 4.8,
    respawnMs: 7500,
    modelId: 'wraith',
    dropPool: ['pot_hp_med', 'sword_runic', 'helm_archmage', 'armor_shadow', 'ring_dusk'],
  },
  orc: {
    id: 'orc',
    name: 'Orc Saqueador',
    level: 18,
    maxHp: 490,
    atk: 38,
    def: 13,
    speed: 2.5,
    xpReward: 175,
    goldMin: 58,
    goldMax: 95,
    color: 0x84cc16,
    scale: 1.18,
    aggroRange: 4.5,
    respawnMs: 8500,
    modelId: 'orc',
    dropPool: ['sword_runic', 'armor_knight', 'ring_ember', 'boots_titan', 'helm_archmage', 'pot_hp_med'],
  },
  orc_shaman: {
    id: 'orc_shaman',
    name: 'Xamã de Krag',
    level: 24,
    maxHp: 680,
    atk: 46,
    def: 16,
    speed: 2.6,
    xpReward: 240,
    goldMin: 80,
    goldMax: 130,
    color: 0xf97316,
    scale: 1.28,
    aggroRange: 5.0,
    respawnMs: 9000,
    modelId: 'orc_shaman',
    dropPool: ['staff_astral', 'armor_astral', 'gloves_warlord', 'ring_ember', 'pot_mp_med'],
  },
  skeleton_knight: {
    id: 'skeleton_knight',
    name: 'Guardião da Cripta',
    level: 32,
    maxHp: 980,
    atk: 58,
    def: 22,
    speed: 2.7,
    xpReward: 340,
    goldMin: 110,
    goldMax: 175,
    color: 0xcbd5e1,
    scale: 1.25,
    aggroRange: 5.0,
    respawnMs: 9000,
    modelId: 'skeleton_knight',
    dropPool: ['sword_crypt', 'armor_crypt', 'helm_crypt', 'boots_titan', 'pot_hp_large'],
  },
  ancient_lich: {
    id: 'ancient_lich',
    name: 'Lich Soberano',
    level: 40,
    maxHp: 2200,
    atk: 78,
    def: 28,
    speed: 2.5,
    xpReward: 780,
    goldMin: 260,
    goldMax: 420,
    isBoss: true,
    color: 0x60a5fa,
    scale: 1.55,
    aggroRange: 5.5,
    respawnMs: 18000,
    modelId: 'ancient_lich',
    dropPool: ['staff_lich', 'armor_crypt', 'helm_crypt', 'ring_ember', 'ring_legend'],
  },
  magma_elem: {
    id: 'magma_elem',
    name: 'Elemental de Magma',
    level: 46,
    maxHp: 1650,
    atk: 86,
    def: 30,
    speed: 2.4,
    xpReward: 560,
    goldMin: 160,
    goldMax: 260,
    color: 0xfb923c,
    scale: 1.2,
    aggroRange: 5.0,
    respawnMs: 10000,
    modelId: 'magma_elem',
    dropPool: ['pot_hp_large', 'pot_mp_large', 'sword_volcanic', 'boots_volcanic', 'gloves_warlord'],
  },
  boss_golem: {
    id: 'boss_golem',
    name: 'Golem Ancestral',
    level: 52,
    maxHp: 3800,
    atk: 105,
    def: 36,
    speed: 2.1,
    xpReward: 1350,
    goldMin: 420,
    goldMax: 680,
    isBoss: true,
    color: 0xf59e0b,
    scale: 1.65,
    aggroRange: 5.5,
    respawnMs: 20000,
    modelId: 'boss_golem',
    dropPool: ['ring_legend', 'sword_volcanic', 'armor_dragon', 'gloves_warlord', 'staff_astral'],
  },
  frost_yeti: {
    id: 'frost_yeti',
    name: 'Yeti Glacial',
    level: 62,
    maxHp: 2900,
    atk: 122,
    def: 42,
    speed: 2.6,
    xpReward: 980,
    goldMin: 260,
    goldMax: 410,
    color: 0x7dd3fc,
    scale: 1.35,
    aggroRange: 5.2,
    respawnMs: 10000,
    modelId: 'frost_yeti',
    dropPool: ['pot_hp_large', 'sword_frost', 'armor_frost', 'helm_frost', 'boots_frost'],
  },
  ice_dragon: {
    id: 'ice_dragon',
    name: 'Drakkar de Gelo',
    level: 74,
    maxHp: 6800,
    atk: 158,
    def: 52,
    speed: 2.4,
    xpReward: 2600,
    goldMin: 750,
    goldMax: 1200,
    isBoss: true,
    color: 0x0ea5e9,
    scale: 1.85,
    aggroRange: 6.0,
    respawnMs: 24000,
    modelId: 'ice_dragon',
    dropPool: ['sword_frost', 'staff_frost', 'armor_frost', 'ring_frost', 'ring_legend'],
  },
  abyss_fiend: {
    id: 'abyss_fiend',
    name: 'Demônio Abissal',
    level: 85,
    maxHp: 5200,
    atk: 190,
    def: 62,
    speed: 2.9,
    xpReward: 1950,
    goldMin: 480,
    goldMax: 760,
    color: 0xf43f5e,
    scale: 1.4,
    aggroRange: 5.5,
    respawnMs: 11000,
    modelId: 'abyss_fiend',
    dropPool: ['pot_hp_large', 'pot_mp_large', 'gloves_abyss', 'boots_abyss', 'helm_immortal'],
  },
  abyss_lord: {
    id: 'abyss_lord',
    name: 'Senhor do Abismo',
    level: 100,
    maxHp: 14500,
    atk: 260,
    def: 80,
    speed: 2.5,
    xpReward: 6200,
    goldMin: 1600,
    goldMax: 2600,
    isBoss: true,
    color: 0xbe123c,
    scale: 2.05,
    aggroRange: 6.5,
    respawnMs: 30000,
    modelId: 'abyss_lord',
    dropPool: ['sword_abyss', 'staff_eternity', 'armor_abyss', 'ring_abyss', 'helm_immortal'],
  },
  bandit: {
    id: 'bandit',
    name: 'Bandido do Vale',
    level: 6,
    maxHp: 190,
    atk: 19,
    def: 6,
    speed: 2.8,
    xpReward: 64,
    goldMin: 22,
    goldMax: 38,
    color: 0xb45309,
    scale: 1.0,
    aggroRange: 4.2,
    respawnMs: 6500,
    modelId: 'bandit',
    dropPool: ['pot_hp_small', 'sword_steel', 'gloves_scout', 'boots_swift'],
  },
  treant: {
    id: 'treant',
    name: 'Ente Corrompido',
    level: 12,
    maxHp: 310,
    atk: 28,
    def: 9,
    speed: 2.2,
    xpReward: 105,
    goldMin: 36,
    goldMax: 60,
    color: 0x15803d,
    scale: 1.25,
    aggroRange: 4.5,
    respawnMs: 7500,
    modelId: 'treant',
    dropPool: ['pot_hp_med', 'staff_oak', 'armor_shadow', 'ring_dusk'],
  },
  scarab: {
    id: 'scarab',
    name: 'Escaravelho Dourado',
    level: 36,
    maxHp: 1200,
    atk: 66,
    def: 25,
    speed: 3.1,
    xpReward: 410,
    goldMin: 130,
    goldMax: 210,
    color: 0xeab308,
    scale: 1.05,
    aggroRange: 5.0,
    respawnMs: 8500,
    modelId: 'scarab',
    dropPool: ['pot_hp_large', 'sword_crypt', 'armor_crypt', 'boots_titan'],
  },
  sand_golem: {
    id: 'sand_golem',
    name: 'Colosso de Areia',
    level: 42,
    maxHp: 2800,
    atk: 88,
    def: 32,
    speed: 2.2,
    xpReward: 950,
    goldMin: 320,
    goldMax: 520,
    isBoss: true,
    color: 0xfacc15,
    scale: 1.6,
    aggroRange: 5.5,
    respawnMs: 18000,
    modelId: 'sand_golem',
    dropPool: ['sword_volcanic', 'armor_dragon', 'ring_ember', 'helm_crypt'],
  },
  seraph_fallen: {
    id: 'seraph_fallen',
    name: 'Serafim Caído',
    level: 108,
    maxHp: 8400,
    atk: 285,
    def: 92,
    speed: 3.0,
    xpReward: 3400,
    goldMin: 820,
    goldMax: 1300,
    color: 0xfde047,
    scale: 1.35,
    aggroRange: 5.5,
    respawnMs: 11000,
    modelId: 'seraph_fallen',
    dropPool: ['pot_hp_mythic', 'pot_mp_mythic', 'gloves_celestial', 'boots_celestial', 'helm_celestial'],
  },
  celestial_warden: {
    id: 'celestial_warden',
    name: 'Guardião Astral',
    level: 125,
    maxHp: 22000,
    atk: 360,
    def: 115,
    speed: 2.5,
    xpReward: 9500,
    goldMin: 2400,
    goldMax: 3800,
    isBoss: true,
    color: 0xfef08a,
    scale: 1.95,
    aggroRange: 6.0,
    respawnMs: 26000,
    modelId: 'celestial_warden',
    dropPool: ['sword_celestial', 'staff_celestial', 'armor_celestial', 'ring_celestial'],
  },
  void_stalker: {
    id: 'void_stalker',
    name: 'Caçador do Vazio',
    level: 145,
    maxHp: 14000,
    atk: 420,
    def: 135,
    speed: 3.3,
    xpReward: 5800,
    goldMin: 1400,
    goldMax: 2200,
    color: 0xc084fc,
    scale: 1.45,
    aggroRange: 5.8,
    respawnMs: 12000,
    modelId: 'void_stalker',
    dropPool: ['pot_hp_mythic', 'pot_mp_mythic', 'gloves_eternal', 'boots_eternal', 'helm_eternal'],
  },
  eternal_emperor: {
    id: 'eternal_emperor',
    name: 'Imperador Eterno',
    level: 180,
    maxHp: 42000,
    atk: 580,
    def: 180,
    speed: 2.7,
    xpReward: 22000,
    goldMin: 5000,
    goldMax: 8500,
    isBoss: true,
    color: 0xa855f7,
    scale: 2.2,
    aggroRange: 6.5,
    respawnMs: 35000,
    modelId: 'eternal_emperor',
    dropPool: ['sword_eternal', 'staff_omni', 'armor_eternal', 'ring_eternal', 'helm_eternal'],
  },
};

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  // Potions
  pot_hp_small: { id: 'pot_hp_small', name: 'Poção de Vida', kind: 'potion_hp', rarity: 'common', iconKey: 'pot_hp', restoreAmount: 110 },
  pot_hp_med: { id: 'pot_hp_med', name: 'Elixir de Vida', kind: 'potion_hp', rarity: 'uncommon', iconKey: 'pot_hp', restoreAmount: 320 },
  pot_hp_large: { id: 'pot_hp_large', name: 'Elixir Vital Supremo', kind: 'potion_hp', rarity: 'rare', iconKey: 'pot_hp', restoreAmount: 900 },
  pot_mp_small: { id: 'pot_mp_small', name: 'Poção de Mana', kind: 'potion_mp', rarity: 'common', iconKey: 'pot_mp', restoreAmount: 75 },
  pot_mp_med: { id: 'pot_mp_med', name: 'Elixir de Mana', kind: 'potion_mp', rarity: 'uncommon', iconKey: 'pot_mp', restoreAmount: 220 },
  pot_mp_large: { id: 'pot_mp_large', name: 'Elixir Arcano Supremo', kind: 'potion_mp', rarity: 'rare', iconKey: 'pot_mp', restoreAmount: 650 },
  pot_hp_mythic: { id: 'pot_hp_mythic', name: 'Néctar da Imortalidade', kind: 'potion_hp', rarity: 'epic', iconKey: 'pot_hp', restoreAmount: 2400 },
  pot_mp_mythic: { id: 'pot_mp_mythic', name: 'Essência Astral Pura', kind: 'potion_mp', rarity: 'epic', iconKey: 'pot_mp', restoreAmount: 1800 },
  // Materials & Buff Elixirs
  mat_essence: { id: 'mat_essence', name: 'Essência Etérea', kind: 'material', rarity: 'common', iconKey: 'mat', effectDesc: 'Material de Craft (monstros comuns)' },
  mat_fang: { id: 'mat_fang', name: 'Presa Sombria', kind: 'material', rarity: 'uncommon', iconKey: 'mat', effectDesc: 'Material de Craft (lobos, aranhas e orcs)' },
  mat_core: { id: 'mat_core', name: 'Núcleo Ancestral', kind: 'material', rarity: 'epic', iconKey: 'mat', effectDesc: 'Material raro de Chefes e Masmorra de Ondas' },
  mat_shard: { id: 'mat_shard', name: 'Fragmento Abissal', kind: 'material', rarity: 'mythic', iconKey: 'mat', effectDesc: 'Relíquia mítica de Chefes Lv.50+' },
  elixir_fury: {
    id: 'elixir_fury',
    name: 'Elixir da Fúria',
    kind: 'buff',
    rarity: 'rare',
    iconKey: 'elixir',
    effectDesc: '+25% ATQ por 5 minutos',
    buffEffect: { name: 'Fúria', durationMs: 300000, atkPct: 0.25 },
  },
  elixir_wisdom: {
    id: 'elixir_wisdom',
    name: 'Elixir da Sabedoria',
    kind: 'buff',
    rarity: 'rare',
    iconKey: 'elixir',
    effectDesc: '+35% XP & +25% Ouro por 5 minutos',
    buffEffect: { name: 'Sabedoria', durationMs: 300000, xpBonus: 0.35, goldBonus: 0.25 },
  },
  elixir_crit: {
    id: 'elixir_crit',
    name: 'Elixir da Precisão',
    kind: 'buff',
    rarity: 'epic',
    iconKey: 'elixir',
    effectDesc: '+15% Chance Crítica & +35% Dano Crítico por 5 min',
    buffEffect: { name: 'Precisão', durationMs: 300000, critChance: 0.15, critDmg: 0.35 },
  },
  // Weapons (Tier 1 -> Tier 6 Mythic)
  sword_iron: { id: 'sword_iron', name: 'Espada de Ferro', kind: 'equip', slot: 'weapon', rarity: 'common', iconKey: 'sword', atkBonus: 6 },
  sword_steel: { id: 'sword_steel', name: 'Lâmina Templária', kind: 'equip', slot: 'weapon', rarity: 'uncommon', iconKey: 'sword', atkBonus: 13, critBonus: 0.02 },
  sword_runic: { id: 'sword_runic', name: 'Espada Rúnica', kind: 'equip', slot: 'weapon', rarity: 'rare', iconKey: 'sword', atkBonus: 24, critBonus: 0.04, procLightning: 0.18, effectDesc: '18% chance de Raio Rúnico (+35% dano)' },
  sword_crypt: { id: 'sword_crypt', name: 'Lâmina da Cripta', kind: 'equip', slot: 'weapon', rarity: 'epic', iconKey: 'sword', atkBonus: 44, critBonus: 0.06, lifestealBonus: 0.03, effectDesc: '+3% Roubo de Vida por golpe' },
  sword_volcanic: { id: 'sword_volcanic', name: 'Montante Vulcânica', kind: 'equip', slot: 'weapon', rarity: 'epic', iconKey: 'sword', atkBonus: 62, hpBonus: 120, critBonus: 0.07, bossDmgBonus: 0.15, effectDesc: '+15% Dano contra Chefes' },
  sword_frost: { id: 'sword_frost', name: 'Lâmina de Drakkar', kind: 'equip', slot: 'weapon', rarity: 'legendary', iconKey: 'sword', atkBonus: 88, critBonus: 0.09, critDmgBonus: 0.25, procLightning: 0.25, effectDesc: '+25% Dano Crítico • 25% Raio Glacial' },
  sword_abyss: { id: 'sword_abyss', name: 'Lâmina do Abismo', kind: 'equip', slot: 'weapon', rarity: 'mythic', iconKey: 'sword', atkBonus: 135, hpBonus: 260, critBonus: 0.12, lifestealBonus: 0.05, bossDmgBonus: 0.25, effectDesc: '+5% Roubo de Vida • +25% vs Chefes' },
  staff_oak: { id: 'staff_oak', name: 'Cajado de Carvalho', kind: 'equip', slot: 'weapon', rarity: 'uncommon', iconKey: 'staff', atkBonus: 14, mpBonus: 20 },
  staff_astral: { id: 'staff_astral', name: 'Cajado Astral', kind: 'equip', slot: 'weapon', rarity: 'epic', iconKey: 'staff', atkBonus: 36, mpBonus: 55, critBonus: 0.05, cdrBonus: 0.08, effectDesc: '-8% Recarga de Skills' },
  staff_lich: { id: 'staff_lich', name: 'Cetro do Lich', kind: 'equip', slot: 'weapon', rarity: 'epic', iconKey: 'staff', atkBonus: 58, mpBonus: 95, critBonus: 0.06, lifestealBonus: 0.03, effectDesc: '+3% Sifão Vital (Roubo de Vida)' },
  staff_frost: { id: 'staff_frost', name: 'Cajado Boreal', kind: 'equip', slot: 'weapon', rarity: 'legendary', iconKey: 'staff', atkBonus: 90, mpBonus: 150, critBonus: 0.08, cdrBonus: 0.12, critDmgBonus: 0.25, effectDesc: '-12% Recarga • +25% Dano Crítico' },
  staff_eternity: { id: 'staff_eternity', name: 'Cajado da Eternidade', kind: 'equip', slot: 'weapon', rarity: 'mythic', iconKey: 'staff', atkBonus: 140, mpBonus: 260, critBonus: 0.12, cdrBonus: 0.15, bossDmgBonus: 0.28, effectDesc: '-15% Recarga • +28% vs Chefes' },
  // Armors
  armor_leather: { id: 'armor_leather', name: 'Couraça Leve', kind: 'equip', slot: 'armor', rarity: 'common', iconKey: 'armor', defBonus: 5, hpBonus: 30 },
  armor_shadow: { id: 'armor_shadow', name: 'Gibão Crepuscular', kind: 'equip', slot: 'armor', rarity: 'uncommon', iconKey: 'armor', defBonus: 10, hpBonus: 65, critBonus: 0.02 },
  armor_knight: { id: 'armor_knight', name: 'Armadura de Placas', kind: 'equip', slot: 'armor', rarity: 'rare', iconKey: 'armor', defBonus: 16, hpBonus: 95 },
  armor_astral: { id: 'armor_astral', name: 'Manto do Arcanista', kind: 'equip', slot: 'armor', rarity: 'epic', iconKey: 'armor', defBonus: 20, hpBonus: 130, mpBonus: 60 },
  armor_crypt: { id: 'armor_crypt', name: 'Couraça Espectral', kind: 'equip', slot: 'armor', rarity: 'epic', iconKey: 'armor', defBonus: 28, hpBonus: 210 },
  armor_dragon: { id: 'armor_dragon', name: 'Armadura Dracônica', kind: 'equip', slot: 'armor', rarity: 'legendary', iconKey: 'armor', defBonus: 42, hpBonus: 340, thornsPct: 0.18, effectDesc: 'Espinhos: reflete 18% do dano recebido' },
  armor_frost: { id: 'armor_frost', name: 'Cota Glacial', kind: 'equip', slot: 'armor', rarity: 'legendary', iconKey: 'armor', defBonus: 48, hpBonus: 410, mpBonus: 90, thornsPct: 0.20, effectDesc: 'Espinhos: reflete 20% do dano recebido' },
  armor_abyss: { id: 'armor_abyss', name: 'Armadura Abissal', kind: 'equip', slot: 'armor', rarity: 'mythic', iconKey: 'armor', defBonus: 72, hpBonus: 680, critBonus: 0.05, thornsPct: 0.28, effectDesc: 'Espinhos: reflete 28% do dano recebido' },
  // Helms
  helm_iron: { id: 'helm_iron', name: 'Elmo de Guardião', kind: 'equip', slot: 'helm', rarity: 'uncommon', iconKey: 'helm', defBonus: 7, hpBonus: 45 },
  helm_archmage: { id: 'helm_archmage', name: 'Coroa Rúnica', kind: 'equip', slot: 'helm', rarity: 'rare', iconKey: 'helm', defBonus: 12, hpBonus: 70, mpBonus: 40 },
  helm_crypt: { id: 'helm_crypt', name: 'Elmo da Cripta', kind: 'equip', slot: 'helm', rarity: 'epic', iconKey: 'helm', defBonus: 22, hpBonus: 160 },
  helm_frost: { id: 'helm_frost', name: 'Diadema de Drakkar', kind: 'equip', slot: 'helm', rarity: 'legendary', iconKey: 'helm', defBonus: 34, hpBonus: 280, mpBonus: 80 },
  helm_immortal: { id: 'helm_immortal', name: 'Coroa Imortal', kind: 'equip', slot: 'helm', rarity: 'mythic', iconKey: 'helm', defBonus: 52, hpBonus: 460, critBonus: 0.06 },
  // Gloves
  gloves_leather: { id: 'gloves_leather', name: 'Luvas de Couro', kind: 'equip', slot: 'gloves', rarity: 'common', iconKey: 'gloves', atkBonus: 4, defBonus: 3 },
  gloves_scout: { id: 'gloves_scout', name: 'Luvas do Batedor', kind: 'equip', slot: 'gloves', rarity: 'uncommon', iconKey: 'gloves', atkBonus: 9, defBonus: 5, critBonus: 0.02 },
  gloves_warlord: { id: 'gloves_warlord', name: 'Manoplas do Titã', kind: 'equip', slot: 'gloves', rarity: 'epic', iconKey: 'gloves', atkBonus: 16, defBonus: 10, critBonus: 0.05 },
  gloves_abyss: { id: 'gloves_abyss', name: 'Manoplas Abissais', kind: 'equip', slot: 'gloves', rarity: 'mythic', iconKey: 'gloves', atkBonus: 48, defBonus: 28, critBonus: 0.09 },
  // Boots
  boots_swift: { id: 'boots_swift', name: 'Botas Ágeis', kind: 'equip', slot: 'boots', rarity: 'uncommon', iconKey: 'boots', defBonus: 6, hpBonus: 35, critBonus: 0.03 },
  boots_titan: { id: 'boots_titan', name: 'Grevas Vulcânicas', kind: 'equip', slot: 'boots', rarity: 'rare', iconKey: 'boots', defBonus: 14, hpBonus: 85 },
  boots_volcanic: { id: 'boots_volcanic', name: 'Botas de Magma', kind: 'equip', slot: 'boots', rarity: 'epic', iconKey: 'boots', defBonus: 22, hpBonus: 170, critBonus: 0.04 },
  boots_frost: { id: 'boots_frost', name: 'Grevas Glaciais', kind: 'equip', slot: 'boots', rarity: 'legendary', iconKey: 'boots', defBonus: 32, hpBonus: 280, critBonus: 0.05 },
  boots_abyss: { id: 'boots_abyss', name: 'Botas Etéreas', kind: 'equip', slot: 'boots', rarity: 'mythic', iconKey: 'boots', defBonus: 48, hpBonus: 440, critBonus: 0.08 },
  // Rings
  ring_dusk: { id: 'ring_dusk', name: 'Anel do Crepúsculo', kind: 'equip', slot: 'ring', rarity: 'rare', iconKey: 'ring', atkBonus: 11, hpBonus: 55, critBonus: 0.02 },
  ring_ember: { id: 'ring_ember', name: 'Anel da Brasa', kind: 'equip', slot: 'ring', rarity: 'epic', iconKey: 'ring', atkBonus: 18, hpBonus: 80, critBonus: 0.04, critDmgBonus: 0.15, effectDesc: '+15% Dano Crítico' },
  ring_legend: { id: 'ring_legend', name: 'Selo do Soberano', kind: 'equip', slot: 'ring', rarity: 'legendary', iconKey: 'ring', atkBonus: 34, defBonus: 15, hpBonus: 160, critBonus: 0.08, bossDmgBonus: 0.18, effectDesc: '+18% Dano contra Chefes' },
  ring_frost: { id: 'ring_frost', name: 'Anel de Drakkar', kind: 'equip', slot: 'ring', rarity: 'legendary', iconKey: 'ring', atkBonus: 46, defBonus: 22, hpBonus: 240, critBonus: 0.09, critDmgBonus: 0.25, effectDesc: '+25% Dano Crítico' },
  ring_abyss: { id: 'ring_abyss', name: 'Selo do Abismo', kind: 'equip', slot: 'ring', rarity: 'mythic', iconKey: 'ring', atkBonus: 75, defBonus: 38, hpBonus: 420, critBonus: 0.14, lifestealBonus: 0.04, critDmgBonus: 0.30, effectDesc: '+4% Roubo de Vida • +30% Dano Crítico' },
  // Tier 7 Celestial & Tier 8 Eternal
  sword_celestial: { id: 'sword_celestial', name: 'Espada Seráfica', kind: 'equip', slot: 'weapon', rarity: 'mythic', iconKey: 'sword', atkBonus: 195, hpBonus: 420, critBonus: 0.14 },
  staff_celestial: { id: 'staff_celestial', name: 'Cetro Celestial', kind: 'equip', slot: 'weapon', rarity: 'mythic', iconKey: 'staff', atkBonus: 205, mpBonus: 420, critBonus: 0.14 },
  armor_celestial: { id: 'armor_celestial', name: 'Armadura dos Céus', kind: 'equip', slot: 'armor', rarity: 'mythic', iconKey: 'armor', defBonus: 105, hpBonus: 980, critBonus: 0.06 },
  helm_celestial: { id: 'helm_celestial', name: 'Auréola de Guerra', kind: 'equip', slot: 'helm', rarity: 'mythic', iconKey: 'helm', defBonus: 78, hpBonus: 650, critBonus: 0.07 },
  gloves_celestial: { id: 'gloves_celestial', name: 'Manoplas Astrais', kind: 'equip', slot: 'gloves', rarity: 'mythic', iconKey: 'gloves', atkBonus: 72, defBonus: 42, critBonus: 0.10 },
  boots_celestial: { id: 'boots_celestial', name: 'Grevas Aladas', kind: 'equip', slot: 'boots', rarity: 'mythic', iconKey: 'boots', defBonus: 70, hpBonus: 620, critBonus: 0.09 },
  ring_celestial: { id: 'ring_celestial', name: 'Anel do Sol Eterno', kind: 'equip', slot: 'ring', rarity: 'mythic', iconKey: 'ring', atkBonus: 110, defBonus: 55, hpBonus: 650, critBonus: 0.16 },
  sword_eternal: { id: 'sword_eternal', name: 'Lâmina da Eternidade', kind: 'equip', slot: 'weapon', rarity: 'mythic', iconKey: 'sword', atkBonus: 290, hpBonus: 700, critBonus: 0.18, lifestealBonus: 0.06, procLightning: 0.35, effectDesc: '+6% Roubo de Vida • 35% Raio Eterno' },
  staff_omni: { id: 'staff_omni', name: 'Orbe do Infinito', kind: 'equip', slot: 'weapon', rarity: 'mythic', iconKey: 'staff', atkBonus: 305, mpBonus: 750, critBonus: 0.18, cdrBonus: 0.20, procLightning: 0.35, effectDesc: '-20% Recarga • 35% Raio Infinito' },
  armor_eternal: { id: 'armor_eternal', name: 'Égide do Imperador', kind: 'equip', slot: 'armor', rarity: 'mythic', iconKey: 'armor', defBonus: 155, hpBonus: 1600, critBonus: 0.08, thornsPct: 0.35, effectDesc: 'Espinhos: reflete 35% do dano recebido' },
  helm_eternal: { id: 'helm_eternal', name: 'Coroa do Infinito', kind: 'equip', slot: 'helm', rarity: 'mythic', iconKey: 'helm', defBonus: 115, hpBonus: 980, critBonus: 0.09, cdrBonus: 0.12, effectDesc: '-12% Recarga de Skills' },
  gloves_eternal: { id: 'gloves_eternal', name: 'Punhos Cósmicos', kind: 'equip', slot: 'gloves', rarity: 'mythic', iconKey: 'gloves', atkBonus: 110, defBonus: 68, critBonus: 0.13, critDmgBonus: 0.35, effectDesc: '+35% Dano Crítico' },
  boots_eternal: { id: 'boots_eternal', name: 'Passos do Vazio', kind: 'equip', slot: 'boots', rarity: 'mythic', iconKey: 'boots', defBonus: 105, hpBonus: 950, critBonus: 0.11, speedBonus: 0.18, effectDesc: '+18% Velocidade de Movimento' },
  ring_eternal: { id: 'ring_eternal', name: 'Relíquia Eterna', kind: 'equip', slot: 'ring', rarity: 'mythic', iconKey: 'ring', atkBonus: 165, defBonus: 85, hpBonus: 1100, critBonus: 0.20, bossDmgBonus: 0.30, critDmgBonus: 0.40, effectDesc: '+30% vs Chefes • +40% Dano Crítico' },
  // Extra Rings
  ring_jade: { id: 'ring_jade', name: 'Anel de Jade', kind: 'equip', slot: 'ring', rarity: 'uncommon', iconKey: 'ring', atkBonus: 6, hpBonus: 45, critBonus: 0.02 },
  ring_titan: { id: 'ring_titan', name: 'Anel do Colosso', kind: 'equip', slot: 'ring', rarity: 'rare', iconKey: 'ring', atkBonus: 14, defBonus: 10, hpBonus: 90 },
  // Cloaks & Wings (Capa)
  cloak_traveler: { id: 'cloak_traveler', name: 'Capa do Viajante', kind: 'equip', slot: 'cloak', rarity: 'common', iconKey: 'cloak', defBonus: 4, hpBonus: 35, speedBonus: 0.05 },
  cloak_crimson: { id: 'cloak_crimson', name: 'Capa Carmesim Real', kind: 'equip', slot: 'cloak', rarity: 'rare', iconKey: 'cloak', atkBonus: 12, defBonus: 14, hpBonus: 110, speedBonus: 0.08 },
  cloak_seraph: { id: 'cloak_seraph', name: 'Asas de Serafim', kind: 'equip', slot: 'cloak', rarity: 'legendary', iconKey: 'cloak', atkBonus: 45, defBonus: 35, hpBonus: 320, critBonus: 0.06, speedBonus: 0.14, cdrBonus: 0.10, effectDesc: '-10% Recarga • +14% Velocidade' },
  cloak_abyss: { id: 'cloak_abyss', name: 'Manto do Abismo', kind: 'equip', slot: 'cloak', rarity: 'mythic', iconKey: 'cloak', atkBonus: 95, defBonus: 65, hpBonus: 680, critBonus: 0.10, speedBonus: 0.18, lifestealBonus: 0.04, effectDesc: '+4% Roubo de Vida • +18% Velocidade' },
  // Amulets (Amuleto)
  amulet_jade: { id: 'amulet_jade', name: 'Amuleto de Jade', kind: 'equip', slot: 'amulet', rarity: 'uncommon', iconKey: 'amulet', hpBonus: 65, mpBonus: 35, atkBonus: 7 },
  amulet_templar: { id: 'amulet_templar', name: 'Medalhão Templário', kind: 'equip', slot: 'amulet', rarity: 'rare', iconKey: 'amulet', atkBonus: 18, defBonus: 12, hpBonus: 130 },
  amulet_magma: { id: 'amulet_magma', name: 'Coração de Magma', kind: 'equip', slot: 'amulet', rarity: 'epic', iconKey: 'amulet', atkBonus: 36, hpBonus: 240, critBonus: 0.05, bossDmgBonus: 0.15, effectDesc: '+15% Dano contra Chefes' },
  amulet_astral: { id: 'amulet_astral', name: 'Relíquia Astral', kind: 'equip', slot: 'amulet', rarity: 'legendary', iconKey: 'amulet', atkBonus: 68, mpBonus: 180, hpBonus: 420, critBonus: 0.08, cdrBonus: 0.12, effectDesc: '-12% Recarga de Skills' },
  amulet_infinity: { id: 'amulet_infinity', name: 'Amuleto do Infinito', kind: 'equip', slot: 'amulet', rarity: 'mythic', iconKey: 'amulet', atkBonus: 135, defBonus: 60, hpBonus: 850, critBonus: 0.14, critDmgBonus: 0.30, bossDmgBonus: 0.25, effectDesc: '+30% Dano Crítico • +25% vs Chefes' },
  // Mounts (Montaria)
  mount_horse: { id: 'mount_horse', name: 'Cavalo de Guerra', kind: 'equip', slot: 'mount', rarity: 'uncommon', iconKey: 'mount', hpBonus: 80, defBonus: 6, speedBonus: 0.16, effectDesc: '+16% Velocidade de Montaria' },
  mount_wolf: { id: 'mount_wolf', name: 'Lobo das Sombras', kind: 'equip', slot: 'mount', rarity: 'rare', iconKey: 'mount', atkBonus: 22, hpBonus: 150, critBonus: 0.03, speedBonus: 0.22, effectDesc: '+22% Velocidade • Fúria Lupina' },
  mount_lava: { id: 'mount_lava', name: 'Corcel Vulcânico', kind: 'equip', slot: 'mount', rarity: 'epic', iconKey: 'mount', atkBonus: 45, defBonus: 20, hpBonus: 280, speedBonus: 0.28, thornsPct: 0.12, effectDesc: '+28% Vel. • Aura Ígnea (12% Espinhos)' },
  mount_griffin: { id: 'mount_griffin', name: 'Grifo Celestial', kind: 'equip', slot: 'mount', rarity: 'legendary', iconKey: 'mount', atkBonus: 85, defBonus: 40, hpBonus: 520, critBonus: 0.06, speedBonus: 0.36, cdrBonus: 0.10, effectDesc: '+36% Vel. • -10% Recarga' },
  mount_dragon: { id: 'mount_dragon', name: 'Dragão do Abismo', kind: 'equip', slot: 'mount', rarity: 'mythic', iconKey: 'mount', atkBonus: 160, defBonus: 75, hpBonus: 980, critBonus: 0.10, speedBonus: 0.45, bossDmgBonus: 0.25, effectDesc: '+45% Vel. • +25% vs Chefes' },
};

export const MAX_UPGRADE_LEVEL = 20;
export const REBIRTH_MIN_LEVEL = 50;

export function upgradeMultiplier(level = 0): number {
  return 1 + Math.max(0, level) * 0.14;
}

export function upgradeCost(currentLevel = 0): { gold: number; dust: number } {
  const next = currentLevel + 1;
  return {
    gold: 60 * next,
    dust: 4 * next,
  };
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: 'q_slimes', title: 'Limpar o Vale dos Slimes', targetMonsterId: 'slime', requiredCount: 5, xpReward: 120, goldReward: 80, zoneCenter: { x: 14, y: 14 } },
  { id: 'q_wolves', title: 'Caçada aos Lobos Cinzentos', targetMonsterId: 'wolf', requiredCount: 6, xpReward: 260, goldReward: 180, zoneCenter: { x: 34, y: 15 } },
  { id: 'q_spiders', title: 'Exterminar Aranhas Sombrias', targetMonsterId: 'spider', requiredCount: 8, xpReward: 480, goldReward: 320, zoneCenter: { x: 16, y: 16 }, repeatable: true },
  { id: 'q_orcs', title: 'Invasão nas Terras de Krag', targetMonsterId: 'orc', requiredCount: 10, xpReward: 950, goldReward: 600, zoneCenter: { x: 24, y: 18 }, repeatable: true },
  { id: 'q_lich', title: 'Purificar o Lich Soberano', targetMonsterId: 'ancient_lich', requiredCount: 1, xpReward: 1800, goldReward: 1100, zoneCenter: { x: 24, y: 14 }, repeatable: true },
  { id: 'q_boss', title: 'Derrotar o Golem Ancestral', targetMonsterId: 'boss_golem', requiredCount: 1, xpReward: 2800, goldReward: 1800, zoneCenter: { x: 24, y: 14 }, repeatable: true },
  { id: 'q_dragon', title: 'Caçar Drakkar de Gelo', targetMonsterId: 'ice_dragon', requiredCount: 1, xpReward: 5200, goldReward: 3200, zoneCenter: { x: 24, y: 14 }, repeatable: true },
  { id: 'q_abyss', title: 'Contrato: Senhor do Abismo', targetMonsterId: 'abyss_lord', requiredCount: 1, xpReward: 12000, goldReward: 7500, zoneCenter: { x: 24, y: 14 }, repeatable: true },
  { id: 'q_scarab', title: 'Escaravelhos de Solari', targetMonsterId: 'scarab', requiredCount: 8, xpReward: 2200, goldReward: 1350, zoneCenter: { x: 18, y: 18 }, repeatable: true },
  { id: 'q_sand_golem', title: 'Derrubar Colosso de Areia', targetMonsterId: 'sand_golem', requiredCount: 1, xpReward: 2500, goldReward: 1600, zoneCenter: { x: 24, y: 14 }, repeatable: true },
  { id: 'q_celestial', title: 'Desafio do Guardião Astral', targetMonsterId: 'celestial_warden', requiredCount: 1, xpReward: 22000, goldReward: 14000, zoneCenter: { x: 24, y: 14 }, repeatable: true },
  { id: 'q_emperor', title: 'Trono do Imperador Eterno', targetMonsterId: 'eternal_emperor', requiredCount: 1, xpReward: 50000, goldReward: 32000, zoneCenter: { x: 24, y: 14 }, repeatable: true },
];

export interface ShopOffer {
  templateId: string;
  goldCost: number;
  dustCost: number;
}

export const SHOP_OFFERS: ShopOffer[] = [
  { templateId: 'pot_hp_small', goldCost: 25, dustCost: 0 },
  { templateId: 'pot_mp_small', goldCost: 25, dustCost: 0 },
  { templateId: 'pot_hp_med', goldCost: 75, dustCost: 0 },
  { templateId: 'pot_mp_med', goldCost: 75, dustCost: 0 },
  { templateId: 'pot_hp_large', goldCost: 210, dustCost: 0 },
  { templateId: 'pot_mp_large', goldCost: 210, dustCost: 0 },
  { templateId: 'pot_hp_mythic', goldCost: 650, dustCost: 0 },
  { templateId: 'pot_mp_mythic', goldCost: 650, dustCost: 0 },
  { templateId: 'sword_steel', goldCost: 180, dustCost: 0 },
  { templateId: 'staff_oak', goldCost: 180, dustCost: 0 },
  { templateId: 'gloves_leather', goldCost: 120, dustCost: 0 },
  { templateId: 'boots_swift', goldCost: 200, dustCost: 4 },
  { templateId: 'helm_iron', goldCost: 220, dustCost: 5 },
  { templateId: 'armor_knight', goldCost: 480, dustCost: 15 },
  { templateId: 'ring_ember', goldCost: 850, dustCost: 30 },
  { templateId: 'cloak_traveler', goldCost: 140, dustCost: 0 },
  { templateId: 'cloak_crimson', goldCost: 520, dustCost: 14 },
  { templateId: 'amulet_jade', goldCost: 240, dustCost: 4 },
  { templateId: 'amulet_templar', goldCost: 540, dustCost: 16 },
  { templateId: 'ring_jade', goldCost: 190, dustCost: 2 },
  { templateId: 'mount_horse', goldCost: 450, dustCost: 10 },
  { templateId: 'mount_wolf', goldCost: 980, dustCost: 28 },
];

export interface WorldEventDef {
  id: string;
  name: string;
  desc: string;
  xpMult: number;
  dropMult: number;
  goldMult: number;
}

const WORLD_EVENTS: WorldEventDef[] = [
  { id: 'wisdom', name: 'Era da Sabedoria', desc: '+50% XP em todo o mundo', xpMult: 1.5, dropMult: 1.0, goldMult: 1.0 },
  { id: 'treasure', name: 'Chuva de Tesouros', desc: '+60% Chance de Drop', xpMult: 1.0, dropMult: 1.6, goldMult: 1.0 },
  { id: 'gold_rush', name: 'Frenesi de Ouro', desc: '+50% Ouro dos monstros', xpMult: 1.0, dropMult: 1.0, goldMult: 1.5 },
  { id: 'forge_blessing', name: 'Bênção Arcana', desc: '+25% XP e +25% Drop', xpMult: 1.25, dropMult: 1.25, goldMult: 1.0 },
];

export function getActiveWorldEvent(nowMs = Date.now()): WorldEventDef {
  const slot = Math.floor(nowMs / (30 * 60 * 1000)) % WORLD_EVENTS.length;
  return WORLD_EVENTS[slot];
}

// --- Diablo 4-style Build System: Class Passives + 5x5 Paragon Board ---
export interface PassiveBonus {
  atkPct?: number;
  defPct?: number;
  hpPct?: number;
  mpPct?: number;
  critChance?: number;
  critDmg?: number;
  lifesteal?: number;
  cdr?: number;
  bossDmg?: number;
}

export interface PassiveDef {
  id: string;
  heroClass: HeroClass;
  name: string;
  maxRank: number;
  desc: string;
  perRank: PassiveBonus;
}

export const PASSIVE_DEFS: PassiveDef[] = [
  // Warrior (6)
  { id: 'wp_brutal', heroClass: 'warrior', name: 'Força Brutal', maxRank: 3, desc: '+6% ATK por nível', perRank: { atkPct: 0.06 } },
  { id: 'wp_iron', heroClass: 'warrior', name: 'Pele de Ferro', maxRank: 3, desc: '+8% DEF e +5% HP por nível', perRank: { defPct: 0.08, hpPct: 0.05 } },
  { id: 'wp_blood', heroClass: 'warrior', name: 'Sede de Batalha', maxRank: 3, desc: '+2% Roubo de Vida por nível', perRank: { lifesteal: 0.02 } },
  { id: 'wp_fury', heroClass: 'warrior', name: 'Fúria Sangrenta', maxRank: 3, desc: '+4% Chance Crítica por nível', perRank: { critChance: 0.04 } },
  { id: 'wp_titan', heroClass: 'warrior', name: 'Matador de Titãs', maxRank: 3, desc: '+10% Dano contra Chefes por nível', perRank: { bossDmg: 0.10 } },
  { id: 'wp_tempo', heroClass: 'warrior', name: 'Fôlego de Guerra', maxRank: 3, desc: '+5% Redução de Recarga por nível', perRank: { cdr: 0.05 } },
  // Mage (6)
  { id: 'mp_arcane', heroClass: 'mage', name: 'Mente Arcana', maxRank: 3, desc: '+7% ATK e +8% MP por nível', perRank: { atkPct: 0.07, mpPct: 0.08 } },
  { id: 'mp_barrier', heroClass: 'mage', name: 'Barreira Mística', maxRank: 3, desc: '+7% HP e +6% DEF por nível', perRank: { hpPct: 0.07, defPct: 0.06 } },
  { id: 'mp_crit', heroClass: 'mage', name: 'Foco Elemental', maxRank: 3, desc: '+4% Crítico e +12% Dano Crítico', perRank: { critChance: 0.04, critDmg: 0.12 } },
  { id: 'mp_flow', heroClass: 'mage', name: 'Fluxo Temporal', maxRank: 3, desc: '+6% Redução de Recarga por nível', perRank: { cdr: 0.06 } },
  { id: 'mp_siphon', heroClass: 'mage', name: 'Sifão Vital', maxRank: 3, desc: '+1.5% Roubo de Vida por nível', perRank: { lifesteal: 0.015 } },
  { id: 'mp_cataclysm', heroClass: 'mage', name: 'Cataclismo', maxRank: 3, desc: '+10% Dano contra Chefes por nível', perRank: { bossDmg: 0.10 } },
  // Archer (6)
  { id: 'ap_eagle', heroClass: 'archer', name: 'Olho de Águia', maxRank: 3, desc: '+5% Chance Crítica por nível', perRank: { critChance: 0.05 } },
  { id: 'ap_lethal', heroClass: 'archer', name: 'Flecha Letal', maxRank: 3, desc: '+15% Dano Crítico por nível', perRank: { critDmg: 0.15 } },
  { id: 'ap_wind', heroClass: 'archer', name: 'Passos do Vento', maxRank: 3, desc: '+6% ATK e +4% Recarga por nível', perRank: { atkPct: 0.06, cdr: 0.04 } },
  { id: 'ap_hunt', heroClass: 'archer', name: 'Caçador de Feras', maxRank: 3, desc: '+10% Dano contra Chefes por nível', perRank: { bossDmg: 0.10 } },
  { id: 'ap_nature', heroClass: 'archer', name: 'Vigor Silvestre', maxRank: 3, desc: '+7% HP e +5% DEF por nível', perRank: { hpPct: 0.07, defPct: 0.05 } },
  { id: 'ap_leech', heroClass: 'archer', name: 'Seta Vampírica', maxRank: 3, desc: '+1.5% Roubo de Vida por nível', perRank: { lifesteal: 0.015 } },
  // Assassin (6)
  { id: 'sp_shadow', heroClass: 'assassin', name: 'Mestre das Sombras', maxRank: 3, desc: '+7% ATK e +3% Crítico por nível', perRank: { atkPct: 0.07, critChance: 0.03 } },
  { id: 'sp_ambush', heroClass: 'assassin', name: 'Golpe Fatal', maxRank: 3, desc: '+18% Dano Crítico por nível', perRank: { critDmg: 0.18 } },
  { id: 'sp_drain', heroClass: 'assassin', name: 'Lâmina Sedenta', maxRank: 3, desc: '+2.5% Roubo de Vida por nível', perRank: { lifesteal: 0.025 } },
  { id: 'sp_haste', heroClass: 'assassin', name: 'Reflexos Sombrios', maxRank: 3, desc: '+6% Redução de Recarga por nível', perRank: { cdr: 0.06 } },
  { id: 'sp_evade', heroClass: 'assassin', name: 'Manto Evasivo', maxRank: 3, desc: '+6% HP e +6% DEF por nível', perRank: { hpPct: 0.06, defPct: 0.06 } },
  { id: 'sp_boss', heroClass: 'assassin', name: 'Regicídio', maxRank: 3, desc: '+11% Dano contra Chefes por nível', perRank: { bossDmg: 0.11 } },
  // Paladin (6)
  { id: 'pp_bastion', heroClass: 'paladin', name: 'Bastião Divino', maxRank: 3, desc: '+9% DEF e +7% HP por nível', perRank: { defPct: 0.09, hpPct: 0.07 } },
  { id: 'pp_zeal', heroClass: 'paladin', name: 'Zelo Sagrado', maxRank: 3, desc: '+6% ATK e +3% Crítico por nível', perRank: { atkPct: 0.06, critChance: 0.03 } },
  { id: 'pp_light', heroClass: 'paladin', name: 'Luz Curativa', maxRank: 3, desc: '+2% Roubo de Vida por nível', perRank: { lifesteal: 0.02 } },
  { id: 'pp_judgment', heroClass: 'paladin', name: 'Sentença Celestial', maxRank: 3, desc: '+12% Dano Crítico e +5% Recarga', perRank: { critDmg: 0.12, cdr: 0.05 } },
  { id: 'pp_crusade', heroClass: 'paladin', name: 'Cruzada Eterna', maxRank: 3, desc: '+10% Dano contra Chefes por nível', perRank: { bossDmg: 0.10 } },
  { id: 'pp_faith', heroClass: 'paladin', name: 'Fé Inabalável', maxRank: 3, desc: '+10% MP Máximo por nível', perRank: { mpPct: 0.10 } },
];

export type ParagonTier = 'start' | 'common' | 'rare' | 'legendary';

export interface ParagonNodeDef {
  id: string;
  row: number;
  col: number;
  tier: ParagonTier;
  name: string;
  desc: string;
  bonus: PassiveBonus;
}

export const PARAGON_NODES: ParagonNodeDef[] = [
  // Row 0
  { id: '0_0', row: 0, col: 0, tier: 'legendary', name: 'Fúria Implacável', desc: '+25% Dano vs Chefes & +10% ATK', bonus: { bossDmg: 0.25, atkPct: 0.10 } },
  { id: '0_1', row: 0, col: 1, tier: 'common', name: 'Poder Bruto', desc: '+4% ATK', bonus: { atkPct: 0.04 } },
  { id: '0_2', row: 0, col: 2, tier: 'rare', name: 'Olho da Tormenta', desc: '+6% Chance Crítica', bonus: { critChance: 0.06 } },
  { id: '0_3', row: 0, col: 3, tier: 'common', name: 'Foco Místico', desc: '+4% ATK & +5% MP', bonus: { atkPct: 0.04, mpPct: 0.05 } },
  { id: '0_4', row: 0, col: 4, tier: 'legendary', name: 'Execução Arcana', desc: '+12% Crítico & +35% Dano Crítico', bonus: { critChance: 0.12, critDmg: 0.35 } },
  // Row 1
  { id: '1_0', row: 1, col: 0, tier: 'common', name: 'Aço Temperado', desc: '+5% DEF', bonus: { defPct: 0.05 } },
  { id: '1_1', row: 1, col: 1, tier: 'rare', name: 'Precisão Letal', desc: '+15% Dano Crítico', bonus: { critDmg: 0.15 } },
  { id: '1_2', row: 1, col: 2, tier: 'common', name: 'Vigor', desc: '+5% HP Máximo', bonus: { hpPct: 0.05 } },
  { id: '1_3', row: 1, col: 3, tier: 'rare', name: 'Aceleração', desc: '+8% Redução de Recarga', bonus: { cdr: 0.08 } },
  { id: '1_4', row: 1, col: 4, tier: 'common', name: 'Reserva Astral', desc: '+8% MP Máximo', bonus: { mpPct: 0.08 } },
  // Row 2
  { id: '2_0', row: 2, col: 0, tier: 'rare', name: 'Muralha', desc: '+10% DEF & +6% HP', bonus: { defPct: 0.10, hpPct: 0.06 } },
  { id: '2_1', row: 2, col: 1, tier: 'common', name: 'Golpe Firme', desc: '+4% ATK', bonus: { atkPct: 0.04 } },
  { id: '2_2', row: 2, col: 2, tier: 'start', name: 'Portal Paragon', desc: 'Origem do Tabuleiro (+3% Todos Atributos)', bonus: { atkPct: 0.03, defPct: 0.03, hpPct: 0.03 } },
  { id: '2_3', row: 2, col: 3, tier: 'common', name: 'Vitalidade', desc: '+5% HP Máximo', bonus: { hpPct: 0.05 } },
  { id: '2_4', row: 2, col: 4, tier: 'rare', name: 'Frenesi', desc: '+8% Redução de Recarga', bonus: { cdr: 0.08 } },
  // Row 3
  { id: '3_0', row: 3, col: 0, tier: 'common', name: 'Resiliência', desc: '+5% HP & +4% DEF', bonus: { hpPct: 0.05, defPct: 0.04 } },
  { id: '3_1', row: 3, col: 1, tier: 'rare', name: 'Caçador', desc: '+12% Dano vs Chefes', bonus: { bossDmg: 0.12 } },
  { id: '3_2', row: 3, col: 2, tier: 'common', name: 'Brutalidade', desc: '+4% ATK', bonus: { atkPct: 0.04 } },
  { id: '3_3', row: 3, col: 3, tier: 'rare', name: 'Vampirismo', desc: '+3% Roubo de Vida', bonus: { lifesteal: 0.03 } },
  { id: '3_4', row: 3, col: 4, tier: 'common', name: 'Escudo Interior', desc: '+5% DEF', bonus: { defPct: 0.05 } },
  // Row 4
  { id: '4_0', row: 4, col: 0, tier: 'legendary', name: 'Guardião Imortal', desc: '+22% HP Máximo & +18% DEF', bonus: { hpPct: 0.22, defPct: 0.18 } },
  { id: '4_1', row: 4, col: 1, tier: 'common', name: 'Sangue Frio', desc: '+3% Chance Crítica', bonus: { critChance: 0.03 } },
  { id: '4_2', row: 4, col: 2, tier: 'rare', name: 'Maestria Bélica', desc: '+10% ATK & +10% Dano Crítico', bonus: { atkPct: 0.10, critDmg: 0.10 } },
  { id: '4_3', row: 4, col: 3, tier: 'common', name: 'Destreza', desc: '+3% Chance Crítica & +4% CDR', bonus: { critChance: 0.03, cdr: 0.04 } },
  { id: '4_4', row: 4, col: 4, tier: 'legendary', name: 'Sede Sanguinária', desc: '+6% Roubo de Vida & +12% ATK', bonus: { lifesteal: 0.06, atkPct: 0.12 } },
];

export const PARAGON_UNLOCK_LEVEL = 20;

export function getSkillPointsAvailable(level: number, passives: Record<string, number> = {}): number {
  const earned = Math.max(0, level - 1);
  const spent = Object.values(passives).reduce((a, b) => a + (b || 0), 0);
  return Math.max(0, earned - spent);
}

export function getParagonPointsAvailable(level: number, rebirths = 0, paragon: string[] = ['2_2']): number {
  const fromLv = level >= PARAGON_UNLOCK_LEVEL ? level - PARAGON_UNLOCK_LEVEL + 1 : 0;
  const earned = fromLv + Math.max(0, rebirths) * 4;
  const spent = Math.max(0, paragon.filter((id) => id !== '2_2').length);
  return Math.max(0, earned - spent);
}

export function isParagonNodeUnlockable(nodeId: string, activeIds: string[]): boolean {
  if (activeIds.includes(nodeId)) return false;
  const node = PARAGON_NODES.find((n) => n.id === nodeId);
  if (!node) return false;
  return activeIds.some((aid) => {
    const a = PARAGON_NODES.find((n) => n.id === aid);
    return a ? Math.abs(a.row - node.row) + Math.abs(a.col - node.col) === 1 : false;
  });
}

export const MAP_SIZE = 48;
export const SAFE_SPAWN = { x: 24, y: 24 };

export function xpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.45));
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  bonusText: string;
  bonus: {
    atkPct?: number;
    defPct?: number;
    hpPct?: number;
    critChance?: number;
    bossDmg?: number;
    xpBonus?: number;
    goldBonus?: number;
  };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    title: 'Caçador Iniciante',
    desc: 'Derrote 10 monstros em Eldoria.',
    bonusText: '+3% ATQ',
    bonus: { atkPct: 0.03 },
  },
  {
    id: 'boss_slayer',
    title: 'Matador de Chefes',
    desc: 'Derrote qualquer Chefe ou World Boss.',
    bonusText: '+8% Dano vs Chefes',
    bonus: { bossDmg: 0.08 },
  },
  {
    id: 'forge_master',
    title: 'Mestre Ferreiro',
    desc: 'Forje um equipamento até +10 ou mais.',
    bonusText: '+5% DEF & +5% HP',
    bonus: { defPct: 0.05, hpPct: 0.05 },
  },
  {
    id: 'ascended',
    title: 'Imortal Ascendido',
    desc: 'Realize pelo menos 1 Ascensão (Rebirth).',
    bonusText: '+5% Chance Crítica',
    bonus: { critChance: 0.05 },
  },
  {
    id: 'rich_hero',
    title: 'Magnata de Eldoria',
    desc: 'Acumule 5.000 Ouro na bolsa.',
    bonusText: '+15% Ouro',
    bonus: { goldBonus: 0.15 },
  },
  {
    id: 'wave_conqueror',
    title: 'Conquistador de Ondas',
    desc: 'Complete as 5 ondas da Masmorra de Ondas.',
    bonusText: '+10% XP & +5% ATQ',
    bonus: { xpBonus: 0.1, atkPct: 0.05 },
  },
];

export interface CraftRecipe {
  id: string;
  resultTemplateId: string;
  resultQty: number;
  goldCost: number;
  dustCost: number;
  ingredients: Array<{ templateId: string; qty: number }>;
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  { id: 'cr_elixir_fury', resultTemplateId: 'elixir_fury', resultQty: 1, goldCost: 60, dustCost: 2, ingredients: [{ templateId: 'mat_essence', qty: 3 }] },
  { id: 'cr_elixir_wisdom', resultTemplateId: 'elixir_wisdom', resultQty: 1, goldCost: 60, dustCost: 2, ingredients: [{ templateId: 'mat_essence', qty: 3 }] },
  { id: 'cr_elixir_crit', resultTemplateId: 'elixir_crit', resultQty: 1, goldCost: 110, dustCost: 4, ingredients: [{ templateId: 'mat_fang', qty: 3 }] },
  { id: 'cr_pot_hp_mythic', resultTemplateId: 'pot_hp_mythic', resultQty: 3, goldCost: 150, dustCost: 3, ingredients: [{ templateId: 'mat_essence', qty: 4 }] },
  { id: 'cr_pot_mp_mythic', resultTemplateId: 'pot_mp_mythic', resultQty: 3, goldCost: 150, dustCost: 3, ingredients: [{ templateId: 'mat_essence', qty: 4 }] },
  { id: 'cr_cloak_seraph', resultTemplateId: 'cloak_seraph', resultQty: 1, goldCost: 380, dustCost: 12, ingredients: [{ templateId: 'mat_fang', qty: 5 }, { templateId: 'mat_core', qty: 1 }] },
  { id: 'cr_amulet_magma', resultTemplateId: 'amulet_magma', resultQty: 1, goldCost: 420, dustCost: 14, ingredients: [{ templateId: 'mat_fang', qty: 5 }, { templateId: 'mat_core', qty: 1 }] },
  { id: 'cr_mount_lava', resultTemplateId: 'mount_lava', resultQty: 1, goldCost: 650, dustCost: 18, ingredients: [{ templateId: 'mat_fang', qty: 6 }, { templateId: 'mat_core', qty: 2 }] },
  { id: 'cr_ring_legend', resultTemplateId: 'ring_legend', resultQty: 1, goldCost: 900, dustCost: 25, ingredients: [{ templateId: 'mat_core', qty: 3 }, { templateId: 'mat_shard', qty: 1 }] },
  { id: 'cr_sword_abyss', resultTemplateId: 'sword_abyss', resultQty: 1, goldCost: 1500, dustCost: 40, ingredients: [{ templateId: 'mat_core', qty: 4 }, { templateId: 'mat_shard', qty: 3 }] },
];
