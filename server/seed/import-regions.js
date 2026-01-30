const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const prisma = require("../db/client");

const REGION_FILE = path.join(__dirname, "regions.yml");
const CONFIG_FILE = path.join(__dirname, "regions.config.json");

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {
      defaults: { price_cents: 0, district: null },
      prefixes: {},
      overrides: {},
      exclude: []
    };
  }

  const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
  const parsed = JSON.parse(raw);

  return {
    defaults: {
      price_cents: parsed.defaults?.price_cents ?? 0,
      district: parsed.defaults?.district ?? null
    },
    prefixes: parsed.prefixes ?? {},
    overrides: parsed.overrides ?? {},
    exclude: parsed.exclude ?? []
  };
}

function normalizePlotId(regionId) {
  const normalized = regionId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return `plot_${normalized || "region"}`;
}

function titleCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function derivePrefix(regionId) {
  const tokens = regionId.split(/[-_\s]+/).filter(Boolean);
  const alphaToken = tokens.find((token) => /[a-zA-Z]/.test(token));
  return alphaToken ? alphaToken.toLowerCase() : "";
}

function resolveMetadata(regionId, config) {
  const override = config.overrides[regionId] || {};
  const prefix = derivePrefix(regionId);
  const prefixConfig = config.prefixes[prefix] || {};

  const district =
    override.district ??
    prefixConfig.district ??
    config.defaults.district ??
    (prefix ? titleCase(prefix) : null);

  const price_cents =
    override.price_cents ??
    prefixConfig.price_cents ??
    config.defaults.price_cents ??
    0;

  const plot_id = override.plot_id ?? normalizePlotId(regionId);

  return { plot_id, district, price_cents };
}

function computeCuboidArea(region) {
  const minX = region.min?.x ?? 0;
  const maxX = region.max?.x ?? 0;
  const minZ = region.min?.z ?? 0;
  const maxZ = region.max?.z ?? 0;

  const width = Math.abs(maxX - minX) + 1;
  const depth = Math.abs(maxZ - minZ) + 1;

  return width * depth;
}

function computePolygonArea(points) {
  if (!points || points.length < 3) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    sum += current.x * next.z - next.x * current.z;
  }

  return Math.round(Math.abs(sum) / 2);
}

function computeRegionArea(region) {
  if (region.type === "cuboid") {
    return computeCuboidArea(region);
  }

  if (region.type === "poly2d") {
    return computePolygonArea(region.points);
  }

  return 0;
}

async function importRegions() {
  const raw = fs.readFileSync(REGION_FILE, "utf-8");
  const data = yaml.load(raw);
  const regions = data?.regions || {};
  const config = loadConfig();

  const entries = Object.entries(regions);
  let processed = 0;

  for (const [regionId, region] of entries) {
    if (config.exclude.includes(regionId)) {
      continue;
    }

    const area = computeRegionArea(region);
    const { plot_id, district, price_cents } = resolveMetadata(regionId, config);

    await prisma.plot.upsert({
      where: { plot_id },
      update: {
        price_cents,
        district,
        area
      },
      create: {
        plot_id,
        price_cents,
        district,
        area,
        status: "available"
      }
    });

    processed += 1;
  }

  console.log(`Imported ${processed} regions from regions.yml.`);
}

importRegions()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
