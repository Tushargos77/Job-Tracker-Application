// Procedural voxel island. Pure JavaScript, no WebGL, so it can be unit-tested.
// Block centres sit on integer y. Ocean floor is y = 1, water fills up to y = WATER_LEVEL.

export const WORLD = {
  size: 56, // columns per side
  islandRadius: 21, // in blocks
  waterLevel: 3,
  seed: 11,
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const rand = mulberry32(seed);
  const G = 64;
  const grid = new Float32Array(G * G);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const at = (ix, iz) => grid[(iz & (G - 1)) * G + (ix & (G - 1))];
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const value = (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const sx = smooth(x - ix);
    const sz = smooth(z - iz);
    return lerp(
      lerp(at(ix, iz), at(ix + 1, iz), sx),
      lerp(at(ix, iz + 1), at(ix + 1, iz + 1), sx),
      sz
    );
  };
  return (x, z) =>
    0.55 * value(x, z) + 0.3 * value(x * 2 + 17, z * 2 + 9) + 0.15 * value(x * 4 - 5, z * 4 + 31);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function generateWorld(options = {}) {
  const { size, islandRadius, waterLevel, seed } = { ...WORLD, ...options };
  const rand = mulberry32(seed * 7919 + 1);
  const noise = makeNoise(seed);
  const half = size / 2;

  // 1. Height map -----------------------------------------------------------
  const heights = new Int16Array(size * size);
  const H = (ix, iz) =>
    ix < 0 || iz < 0 || ix >= size || iz >= size ? 1 : heights[iz * size + ix];

  for (let iz = 0; iz < size; iz++) {
    for (let ix = 0; ix < size; ix++) {
      const x = ix - half + 0.5;
      const z = iz - half + 0.5;
      const d = Math.hypot(x, z) / islandRadius;
      const falloff = clamp(1 - d * d, -0.6, 1);
      const n = noise(x * 0.11, z * 0.11);
      const e = falloff * 0.95 + (n - 0.5) * 1.6;
      heights[iz * size + ix] = e <= 0.04 ? 1 : Math.round(1 + e * 7.5);
    }
  }

  // 2. Blocks -----------------------------------------------------------------
  const blocks = { grass: [], dirt: [], sand: [], stone: [], log: [], leaves: [] };
  const wx = (ix) => ix - half + 0.5;
  const wz = (iz) => iz - half + 0.5;

  const tintOf = (type) => {
    const l = 0.86 + rand() * 0.2;
    if (type === "grass") return [l * 0.97, l * (1 + rand() * 0.05), l * 0.92];
    if (type === "leaves") return [l * 0.9, l * 1.02, l * 0.9];
    return [l, l, l];
  };

  const put = (type, ix, y, iz) =>
    blocks[type].push({ x: wx(ix), y, z: wz(iz), tint: tintOf(type) });

  const topTypeFor = (h) => (h <= waterLevel + 1 ? "sand" : h >= 9 ? "stone" : "grass");

  for (let iz = 0; iz < size; iz++) {
    for (let ix = 0; ix < size; ix++) {
      const h = H(ix, iz);
      const lowestNeighbour = Math.min(H(ix - 1, iz), H(ix + 1, iz), H(ix, iz - 1), H(ix, iz + 1));
      const yMin = Math.max(1, Math.min(h, lowestNeighbour + 1));
      const top = topTypeFor(h);

      for (let y = yMin; y <= h; y++) {
        const depth = h - y;
        let type;
        if (depth === 0) type = top;
        else if (top === "sand") type = depth <= 3 ? "sand" : "stone";
        else if (top === "grass") type = depth <= 3 ? "dirt" : "stone";
        else type = "stone";
        put(type, ix, y, iz);
      }
    }
  }

  // 3. Trees ------------------------------------------------------------------
  const trees = [];
  const hasTreeNear = (ix, iz) => trees.some((t) => Math.abs(t.ix - ix) + Math.abs(t.iz - iz) < 5);

  for (let iz = 4; iz < size - 4; iz++) {
    for (let ix = 4; ix < size - 4; ix++) {
      const h = H(ix, iz);
      if (topTypeFor(h) !== "grass" || h < waterLevel + 2 || h > 7) continue;
      if (rand() > 0.085) continue;
      const flat =
        Math.abs(H(ix - 1, iz) - h) <= 1 &&
        Math.abs(H(ix + 1, iz) - h) <= 1 &&
        Math.abs(H(ix, iz - 1) - h) <= 1 &&
        Math.abs(H(ix, iz + 1) - h) <= 1;
      if (!flat || hasTreeNear(ix, iz)) continue;

      const trunk = 4 + (rand() < 0.5 ? 1 : 0);
      const topY = h + trunk;
      trees.push({ ix, iz });

      for (let y = h + 1; y <= topY; y++) put("log", ix, y, iz);

      const layer = (y, radius, dropCorners) => {
        for (let dz = -radius; dz <= radius; dz++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const corner = Math.abs(dx) === radius && Math.abs(dz) === radius;
            if (corner && (dropCorners === "all" || (dropCorners === "some" && rand() < 0.5))) continue;
            if (y <= topY && dx === 0 && dz === 0) continue; // trunk occupies this cell
            put("leaves", ix + dx, y, iz + dz);
          }
        }
      };
      layer(topY - 1, 2, "some");
      layer(topY, 2, "some");
      layer(topY + 1, 1, "all");
      put("leaves", ix, topY + 2, iz);
    }
  }

  // 4. Fireflies and clouds (positions only) ---------------------------------
  const fireflies = Array.from({ length: 56 }, () => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 20;
    return { x: Math.cos(a) * r, y: waterLevel + 2 + rand() * 7, z: Math.sin(a) * r, phase: rand() * 6.28 };
  });

  const clouds = Array.from({ length: 10 }, () => ({
    x: -80 + rand() * 160,
    y: 24 + rand() * 7,
    z: -70 + rand() * 80,
    speed: 0.45 + rand() * 0.5,
    parts: Array.from({ length: 2 + Math.floor(rand() * 3) }, (_, i) => ({
      dx: i * (3 + rand() * 2) - 4,
      dz: (rand() - 0.5) * 3,
      sx: 5 + rand() * 4,
      sz: 3 + rand() * 3,
    })),
  }));

  return { size, waterLevel, heights, blocks, trees, fireflies, clouds };
}
