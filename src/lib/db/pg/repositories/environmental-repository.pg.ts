import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  EnvironmentalUsageSchema,
  type EnvironmentalUsageEntity,
} from "../schema.pg";

export interface EnvironmentalRepository {
  /**
   * Update environmental usage for a user in a given month
   * Creates a new record if it doesn't exist, or updates the existing one
   */
  updateEnvironmentalUsage(
    userId: string,
    year: number,
    month: number,
    waterMl: number,
    energyWh: number,
  ): Promise<EnvironmentalUsageEntity>;

  /**
   * Get environmental usage for a specific user and month
   */
  getEnvironmentalUsage(
    userId: string,
    year: number,
    month: number,
  ): Promise<EnvironmentalUsageEntity | null>;

  /**
   * Get current month's environmental usage for a user
   */
  getCurrentMonthUsage(
    userId: string,
  ): Promise<EnvironmentalUsageEntity | null>;

  /**
   * Get environmental usage history for a user
   */
  getEnvironmentalUsageHistory(
    userId: string,
    limit?: number,
  ): Promise<EnvironmentalUsageEntity[]>;
}

export const environmentalRepository: EnvironmentalRepository = {
  async updateEnvironmentalUsage(
    userId: string,
    year: number,
    month: number,
    waterMl: number,
    energyWh: number,
  ): Promise<EnvironmentalUsageEntity> {
    // Use INSERT ... ON CONFLICT to update if exists, insert if not
    const result = await db
      .insert(EnvironmentalUsageSchema)
      .values({
        userId,
        year,
        month,
        totalWaterMl: waterMl.toString(),
        totalEnergyWh: energyWh.toString(),
      })
      .onConflictDoUpdate({
        target: [
          EnvironmentalUsageSchema.userId,
          EnvironmentalUsageSchema.year,
          EnvironmentalUsageSchema.month,
        ],
        set: {
          totalWaterMl: sql`${EnvironmentalUsageSchema.totalWaterMl} + ${waterMl.toString()}`,
          totalEnergyWh: sql`${EnvironmentalUsageSchema.totalEnergyWh} + ${energyWh.toString()}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  },

  async getEnvironmentalUsage(
    userId: string,
    year: number,
    month: number,
  ): Promise<EnvironmentalUsageEntity | null> {
    const result = await db
      .select()
      .from(EnvironmentalUsageSchema)
      .where(
        and(
          eq(EnvironmentalUsageSchema.userId, userId),
          eq(EnvironmentalUsageSchema.year, year),
          eq(EnvironmentalUsageSchema.month, month),
        ),
      )
      .limit(1);

    return result[0] || null;
  },

  async getCurrentMonthUsage(
    userId: string,
  ): Promise<EnvironmentalUsageEntity | null> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    return this.getEnvironmentalUsage(userId, currentYear, currentMonth);
  },

  async getEnvironmentalUsageHistory(
    userId: string,
    limit: number = 12,
  ): Promise<EnvironmentalUsageEntity[]> {
    return db
      .select()
      .from(EnvironmentalUsageSchema)
      .where(eq(EnvironmentalUsageSchema.userId, userId))
      .orderBy(
        sql`${EnvironmentalUsageSchema.year} DESC, ${EnvironmentalUsageSchema.month} DESC`,
      )
      .limit(limit);
  },
};
