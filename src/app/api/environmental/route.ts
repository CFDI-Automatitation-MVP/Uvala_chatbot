import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase-auth";
import { environmentalRepository } from "@/lib/db/repository";
import logger from "logger";

/**
 * GET /api/environmental
 * Fetch current month's environmental usage for authenticated user
 */
export async function GET() {
  try {
    // Get authenticated user
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get current month's environmental usage
    const currentUsage =
      await environmentalRepository.getCurrentMonthUsage(userId);

    if (!currentUsage) {
      // Return zero usage if no data exists yet
      return NextResponse.json({
        waterLiters: 0,
        energyWh: 0,
        waterMl: 0,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      });
    }

    // Convert water from mL to Liters for display
    const waterMl = parseFloat(currentUsage.totalWaterMl);
    const waterLiters = waterMl / 1000;
    const energyWh = parseFloat(currentUsage.totalEnergyWh);

    return NextResponse.json({
      waterLiters: Number(waterLiters.toFixed(3)),
      energyWh: Number(energyWh.toFixed(2)),
      waterMl: Number(waterMl.toFixed(2)),
      year: currentUsage.year,
      month: currentUsage.month,
    });
  } catch (error) {
    logger.error("Failed to fetch environmental usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch environmental usage" },
      { status: 500 },
    );
  }
}
