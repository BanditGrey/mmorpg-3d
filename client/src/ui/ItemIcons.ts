import { ITEM_TEMPLATES, RARITY_META, type EquipSlot, type ItemIconKey, type Rarity } from '@mmorpg/shared';

function getIconSvgBody(key: ItemIconKey, rarityColor: string): string {
  switch (key) {
    case 'sword':
      return `
        <path d="M46 10 L54 10 L54 18 L28 44 L20 36 Z" fill="url(#metal)" stroke="#fff" stroke-opacity="0.4" stroke-width="1"/>
        <path d="M16 32 L32 48 L28 52 L12 36 Z" fill="#d4af37" stroke="#78350f" stroke-width="1.2"/>
        <path d="M14 42 L22 50 L14 54 L10 50 Z" fill="#7c2d12"/>
        <circle cx="12" cy="52" r="3" fill="${rarityColor}"/>`;
    case 'staff':
      return `
        <path d="M16 52 L44 18" stroke="#92400e" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M38 14 C44 8, 54 12, 50 22 C46 28, 36 22, 38 14 Z" fill="${rarityColor}" stroke="#fff" stroke-width="1.2"/>
        <circle cx="44" cy="17" r="4" fill="#fff" opacity="0.7"/>
        <path d="M36 22 L42 28" stroke="#fbbf24" stroke-width="2.5"/>`;
    case 'armor':
      return `
        <path d="M18 14 L26 12 L32 18 L38 12 L46 14 L52 24 L46 30 L44 52 L20 52 L18 30 L12 24 Z" fill="url(#metal)" stroke="${rarityColor}" stroke-width="1.8"/>
        <path d="M26 20 L32 28 L38 20 L38 46 L26 46 Z" fill="#1e293b" opacity="0.6"/>
        <path d="M24 32 L40 32" stroke="#fbbf24" stroke-width="2"/>`;
    case 'helm':
      return `
        <path d="M18 34 C18 16, 46 16, 46 34 L48 48 L36 48 L34 36 L30 36 L28 48 L16 48 Z" fill="url(#metal)" stroke="${rarityColor}" stroke-width="1.8"/>
        <path d="M22 30 L42 30" stroke="#fbbf24" stroke-width="2.2"/>
        <path d="M18 22 L10 12 L22 18 M46 22 L54 12 L42 18" fill="#cbd5e1"/>`;
    case 'gloves':
      return `
        <path d="M14 26 L26 20 L30 30 L28 46 L14 46 Z" fill="#78350f" stroke="${rarityColor}" stroke-width="1.5"/>
        <path d="M34 22 L48 26 L50 46 L36 46 Z" fill="#92400e" stroke="${rarityColor}" stroke-width="1.5"/>
        <rect x="13" y="42" width="16" height="6" rx="2" fill="#d4af37"/>
        <rect x="35" y="42" width="16" height="6" rx="2" fill="#d4af37"/>`;
    case 'boots':
      return `
        <path d="M22 14 L36 14 L36 38 L50 42 L50 50 L20 50 Z" fill="url(#metal)" stroke="${rarityColor}" stroke-width="1.6"/>
        <rect x="20" y="14" width="18" height="6" rx="2" fill="#d4af37"/>
        <path d="M20 48 L50 48" stroke="#0f172a" stroke-width="3"/>`;
    case 'ring':
      return `
        <ellipse cx="32" cy="36" rx="16" ry="13" fill="none" stroke="#fbbf24" stroke-width="6"/>
        <ellipse cx="32" cy="36" rx="16" ry="13" fill="none" stroke="#fef08a" stroke-width="1.5" opacity="0.6"/>
        <polygon points="32,12 40,20 32,28 24,20" fill="${rarityColor}" stroke="#fff" stroke-width="1.2"/>`;
    case 'cloak':
      return `
        <path d="M22 12 L42 12 L52 52 L32 46 L12 52 Z" fill="#7f1d1d" stroke="${rarityColor}" stroke-width="1.8"/>
        <path d="M22 12 L32 22 L42 12" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
        <circle cx="24" cy="15" r="2.5" fill="#fbbf24"/><circle cx="40" cy="15" r="2.5" fill="#fbbf24"/>`;
    case 'amulet':
      return `
        <path d="M18 14 C18 32, 46 32, 46 14" fill="none" stroke="#fbbf24" stroke-width="2.5"/>
        <polygon points="32,26 42,38 32,52 22,38" fill="${rarityColor}" stroke="#fef08a" stroke-width="1.6"/>
        <circle cx="32" cy="38" r="4" fill="#fff" opacity="0.5"/>`;
    case 'mount':
      return `
        <path d="M16 44 L22 28 L34 24 L42 14 L50 18 L46 28 L48 44 L40 44 L38 34 L26 36 L22 44 Z" fill="url(#metal)" stroke="${rarityColor}" stroke-width="1.8"/>
        <circle cx="44" cy="18" r="2" fill="#fbbf24"/>
        <path d="M16 28 C12 22, 16 14, 24 16" fill="none" stroke="${rarityColor}" stroke-width="2.5"/>`;
    case 'pot_hp':
      return `
        <rect x="27" y="11" width="10" height="7" rx="2" fill="#b45309"/>
        <path d="M26 18 L38 18 L48 34 C50 44, 44 52, 32 52 C20 52, 14 44, 16 34 Z" fill="#7f1d1d" stroke="#fca5a5" stroke-width="1.5"/>
        <path d="M19 36 C20 46, 25 49, 32 49 C39 49, 44 46, 45 36 Z" fill="#ef4444"/>
        <ellipse cx="26" cy="30" rx="3" ry="6" fill="#fff" opacity="0.35" transform="rotate(-18 26 30)"/>`;
    case 'pot_mp':
      return `
        <rect x="27" y="11" width="10" height="7" rx="2" fill="#b45309"/>
        <path d="M26 18 L38 18 L48 34 C50 44, 44 52, 32 52 C20 52, 14 44, 16 34 Z" fill="#1e3a8a" stroke="#93c5fd" stroke-width="1.5"/>
        <path d="M19 36 C20 46, 25 49, 32 49 C39 49, 44 46, 45 36 Z" fill="#3b82f6"/>
        <ellipse cx="26" cy="30" rx="3" ry="6" fill="#fff" opacity="0.35" transform="rotate(-18 26 30)"/>`;
    case 'mat':
      return `
        <polygon points="32,10 48,24 42,50 22,50 16,24" fill="${rarityColor}" stroke="#fff" stroke-opacity="0.7" stroke-width="1.6"/>
        <polygon points="32,14 42,26 32,46 22,26" fill="#fff" opacity="0.28"/>
        <circle cx="32" cy="28" r="4" fill="#fff" opacity="0.65"/>`;
    case 'elixir':
      return `
        <rect x="27" y="10" width="10" height="6" rx="2" fill="#fbbf24"/>
        <path d="M26 16 L38 16 L47 32 C50 43, 44 52, 32 52 C20 52, 14 43, 17 32 Z" fill="#312e81" stroke="${rarityColor}" stroke-width="2"/>
        <path d="M20 35 C21 45, 25 49, 32 49 C39 49, 43 45, 44 35 Z" fill="${rarityColor}"/>
        <path d="M28 28 L36 28 M32 24 L32 32" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round"/>`;
  }
}

const SLOT_TO_ICON: Record<EquipSlot, ItemIconKey> = {
  weapon: 'sword',
  armor: 'armor',
  helm: 'helm',
  cloak: 'cloak',
  gloves: 'gloves',
  boots: 'boots',
  amulet: 'amulet',
  ring: 'ring',
  ring2: 'ring',
  mount: 'mount',
};

export function renderEmptySlotIconHtml(slot: EquipSlot, size = 30): string {
  const key = SLOT_TO_ICON[slot];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" style="opacity:0.32;filter:grayscale(1)">
    <defs>
      <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#cbd5e1"/><stop offset="100%" stop-color="#64748b"/>
      </linearGradient>
    </defs>
    ${getIconSvgBody(key, '#94a3b8')}
  </svg>`;
}

export function renderItemIconHtml(
  templateId: string,
  upgradeLevel = 0,
  size = 42
): string {
  const tpl = ITEM_TEMPLATES[templateId];
  const rarity: Rarity = tpl?.rarity ?? 'common';
  const color = RARITY_META[rarity].color;
  const safeId = /^[a-z0-9_-]+$/i.test(templateId) ? templateId : 'unknown';
  const icon = tpl
    ? `<img src="/icons/items/${safeId}.svg" alt="${tpl.name.replace(/[&<>\"']/g, '')}" width="${size - 6}" height="${size - 6}" loading="lazy" style="object-fit:contain" />`
    : `<svg viewBox="0 0 64 64" width="${size - 6}" height="${size - 6}"><path d="M32 7 39 14 28 41 22 45 20 38Z" fill="#94a3b8" stroke="#fff"/><path d="m19 39 7 7-8 9-5-5Z" fill="#7c2d12"/></svg>`;

  return `
    <div style="position:relative;width:${size}px;height:${size}px;border-radius:9px;border:1.5px solid ${color};background:radial-gradient(circle at 35% 30%, ${color}33, #0b111c 80%);box-shadow:inset 0 0 8px ${color}44;flex-shrink:0;display:flex;align-items:center;justify-content:center">
      ${icon}
      ${
        upgradeLevel > 0
          ? `<span style="position:absolute;top:-5px;right:-5px;background:#b45309;border:1px solid #fbbf24;color:#fff;font-size:9px;font-weight:800;padding:1px 4px;border-radius:6px;line-height:1">+${upgradeLevel}</span>`
          : ''
      }
    </div>
  `;
}
