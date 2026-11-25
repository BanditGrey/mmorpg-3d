export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const AOI_CHUNK_SIZE = 16;

export interface Vec2 {
  x: number;
  y: number;
}

/** Convert Cartesian world tile coordinates to screen isometric coordinates. */
export function toIsometric(cartX: number, cartY: number): Vec2 {
  return {
    x: (cartX - cartY) * (TILE_WIDTH / 2),
    y: (cartX + cartY) * (TILE_HEIGHT / 2),
  };
}

/** Convert screen isometric coordinates back to Cartesian world tile coordinates. */
export function toCartesian(screenX: number, screenY: number): Vec2 {
  const halfW = TILE_WIDTH / 2;
  const halfH = TILE_HEIGHT / 2;
  return {
    x: (screenX / halfW + screenY / halfH) / 2,
    y: (screenY / halfH - screenX / halfW) / 2,
  };
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getChunkKey(x: number, y: number): string {
  const cx = Math.floor(x / AOI_CHUNK_SIZE);
  const cy = Math.floor(y / AOI_CHUNK_SIZE);
  return `${cx},${cy}`;
}
