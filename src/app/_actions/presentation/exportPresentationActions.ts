"use server";

import { convertPlateJSToPPTX } from "@/components/presentation/utils/exportToPPT";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { getUser } from "@/lib/auth/supabase-auth";
import { presentationRepository } from "@/lib/db/repositories/presentation-repository";

export async function exportPresentation(
  presentationId: string,
  fileName?: string,
  theme?: Partial<{
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    heading: string;
    muted: string;
  }>,
) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = user.id;

    // Here you would fetch the presentation data from your database
    // This is a placeholder - implement actual data fetching based on your data model
    const presentationData = await fetchPresentationData(
      presentationId,
      userId,
    );

    // Generate the PPT file (ArrayBuffer)
    const arrayBuffer = await convertPlateJSToPPTX(
      { slides: presentationData.slides },
      theme,
    );

    // Convert ArrayBuffer to Base64 string for transmission to the client
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Return base64 data so client can download it
    return {
      success: true,
      data: base64,
      fileName: `${fileName ?? "presentation"}.pptx`,
    };
  } catch (error) {
    console.error("Error exporting presentation:", error);
    return { success: false, error: "Failed to export presentation" };
  }
}

// Helper function to fetch presentation data
async function fetchPresentationData(presentationId: string, userId: string) {
  // Implement your actual data fetching logic here
  // For now returning a placeholder

  // In a real implementation, you would fetch from your database
  const result = await presentationRepository.getPresentation(
    presentationId,
    userId,
  );

  return {
    id: result?.baseDoc.id,
    title: result?.baseDoc.title,
    slides: (
      result?.presentation?.content as unknown as { slides: PlateSlide[] }
    )?.slides,
  };
}
