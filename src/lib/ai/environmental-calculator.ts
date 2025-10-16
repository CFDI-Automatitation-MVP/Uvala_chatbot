import "server-only";

/**
 * Environmental impact calculator based on GPT-5 Mini projections
 * Calculates water and energy consumption based on token usage
 */

export interface EnvironmentalImpact {
  waterMl: number; // Water consumption in milliliters
  energyWh: number; // Energy consumption in watt-hours
}

/**
 * Token ranges for different prompt sizes
 */
const TOKEN_RANGES = {
  SHORT: 400, // Up to 400 tokens
  MEDIUM: 2000, // Up to 2,000 tokens
  LONG: 11500, // Up to 11,500 tokens
} as const;

/**
 * Energy consumption ranges (Wh) based on GPT-5 Mini projections
 */
const ENERGY_CONSUMPTION = {
  SHORT: { min: 0.3, max: 0.5 }, // 400 tokens
  MEDIUM: { min: 1.5, max: 2.5 }, // 2,000 tokens
  LONG: { min: 8.7, max: 14.5 }, // 11,500 tokens
} as const;

/**
 * Water consumption coefficient: 4.27 mL per Wh
 * This is comprehensive scope accounting including off-site water usage
 */
const WATER_PER_WH = 4.27;

/**
 * Calculate environmental impact based on total token count
 * Uses linear interpolation between the defined ranges
 *
 * @param totalTokens - Total number of tokens (input + output)
 * @returns Environmental impact with water (mL) and energy (Wh) consumption
 */
export function calculateEnvironmentalImpact(
  totalTokens: number,
): EnvironmentalImpact {
  if (totalTokens <= 0) {
    return { waterMl: 0, energyWh: 0 };
  }

  let energyWh: number;

  if (totalTokens <= TOKEN_RANGES.SHORT) {
    // Short prompt: use average of range
    energyWh =
      (ENERGY_CONSUMPTION.SHORT.min + ENERGY_CONSUMPTION.SHORT.max) / 2;
  } else if (totalTokens <= TOKEN_RANGES.MEDIUM) {
    // Interpolate between SHORT and MEDIUM
    const ratio =
      (totalTokens - TOKEN_RANGES.SHORT) /
      (TOKEN_RANGES.MEDIUM - TOKEN_RANGES.SHORT);

    const shortAvg =
      (ENERGY_CONSUMPTION.SHORT.min + ENERGY_CONSUMPTION.SHORT.max) / 2;
    const mediumAvg =
      (ENERGY_CONSUMPTION.MEDIUM.min + ENERGY_CONSUMPTION.MEDIUM.max) / 2;

    energyWh = shortAvg + ratio * (mediumAvg - shortAvg);
  } else if (totalTokens <= TOKEN_RANGES.LONG) {
    // Interpolate between MEDIUM and LONG
    const ratio =
      (totalTokens - TOKEN_RANGES.MEDIUM) /
      (TOKEN_RANGES.LONG - TOKEN_RANGES.MEDIUM);

    const mediumAvg =
      (ENERGY_CONSUMPTION.MEDIUM.min + ENERGY_CONSUMPTION.MEDIUM.max) / 2;
    const longAvg =
      (ENERGY_CONSUMPTION.LONG.min + ENERGY_CONSUMPTION.LONG.max) / 2;

    energyWh = mediumAvg + ratio * (longAvg - mediumAvg);
  } else {
    // For tokens beyond LONG range, scale linearly from LONG baseline
    const longAvg =
      (ENERGY_CONSUMPTION.LONG.min + ENERGY_CONSUMPTION.LONG.max) / 2;
    const tokensPerLongPrompt = TOKEN_RANGES.LONG;
    const scaleFactor = totalTokens / tokensPerLongPrompt;

    energyWh = longAvg * scaleFactor;
  }

  // Calculate water consumption based on energy
  const waterMl = energyWh * WATER_PER_WH;

  return {
    waterMl: Number(waterMl.toFixed(4)),
    energyWh: Number(energyWh.toFixed(4)),
  };
}

/**
 * Format water usage for display
 * Converts mL to appropriate unit (mL or L)
 */
export function formatWaterUsage(waterMl: number): string {
  if (waterMl >= 1000) {
    const liters = waterMl / 1000;
    return `${liters.toFixed(2)} L`;
  }
  return `${waterMl.toFixed(2)} mL`;
}

/**
 * Format energy usage for display
 * Converts Wh to appropriate unit (Wh or kWh)
 */
export function formatEnergyUsage(energyWh: number): string {
  if (energyWh >= 1000) {
    const kWh = energyWh / 1000;
    return `${kWh.toFixed(2)} kWh`;
  }
  return `${energyWh.toFixed(2)} Wh`;
}

/**
 * Get token range category for a given token count
 */
export function getTokenCategory(
  totalTokens: number,
): "short" | "medium" | "long" | "extra-long" {
  if (totalTokens <= TOKEN_RANGES.SHORT) return "short";
  if (totalTokens <= TOKEN_RANGES.MEDIUM) return "medium";
  if (totalTokens <= TOKEN_RANGES.LONG) return "long";
  return "extra-long";
}
