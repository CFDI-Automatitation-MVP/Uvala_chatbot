"use server";

import { type PlateSlide } from "@/components/presentation/utils/parser";
import { getUser } from "@/lib/auth/supabase-auth";
import { presentationRepository } from "@/lib/db/repositories/presentation-repository";

export async function createPresentation({
  content,
  title,
  theme = "default",
  outline,
  imageSource,
  presentationStyle,
  language,
}: {
  content: {
    slides: PlateSlide[];
  };
  title: string;
  theme?: string;
  outline?: string[];
  imageSource?: string;
  presentationStyle?: string;
  language?: string;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    const result = await presentationRepository.createPresentation({
      title: title ?? "Untitled Presentation",
      userId,
      content,
      theme,
      outline,
      imageSource,
      presentationStyle,
      language,
    });

    return {
      success: true,
      message: "Presentation created successfully",
      presentation: {
        ...result.baseDoc,
        presentation: result.presentation,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to create presentation",
    };
  }
}

export async function createEmptyPresentation(
  title: string,
  theme = "default",
  language = "en-US",
) {
  const emptyContent: { slides: PlateSlide[] } = { slides: [] };

  return createPresentation({
    content: emptyContent,
    title,
    theme,
    language,
  });
}

export async function updatePresentation({
  id,
  content,
  prompt,
  title,
  theme,
  outline,
  searchResults,
  imageSource: _imageSource,
  presentationStyle: _presentationStyle,
  language: _language,
  thumbnailUrl,
}: {
  id: string;
  content?: {
    slides: PlateSlide[];
    config: Record<string, unknown>;
  };
  title?: string;
  theme?: string;
  prompt?: string;
  outline?: string[];
  searchResults?: Array<{ query: string; results: unknown[] }>;
  imageSource?: string;
  presentationStyle?: string;
  language?: string;
  thumbnailUrl?: string;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    await presentationRepository.updatePresentation(id, userId, {
      title,
      content,
      theme,
      thumbnailUrl,
      outline,
      prompt,
      searchResults,
    });

    // Fetch the updated presentation
    const updated = await presentationRepository.getPresentation(id, userId);

    return {
      success: true,
      message: "Presentation updated successfully",
      presentation: updated
        ? {
            ...updated.baseDoc,
            presentation: updated.presentation,
          }
        : null,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation",
    };
  }
}

export async function updatePresentationTitle(id: string, title: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    await presentationRepository.updatePresentation(id, userId, { title });

    const updated = await presentationRepository.getPresentation(id, userId);

    return {
      success: true,
      message: "Presentation title updated successfully",
      presentation: updated
        ? {
            ...updated.baseDoc,
            presentation: updated.presentation,
          }
        : null,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation title",
    };
  }
}

export async function deletePresentation(id: string) {
  return deletePresentations([id]);
}

export async function deletePresentations(ids: string[]) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    const deletedCount = await presentationRepository.deletePresentations(
      ids,
      userId,
    );

    const failedCount = ids.length - deletedCount;

    if (failedCount > 0) {
      return {
        success: deletedCount > 0,
        message:
          deletedCount > 0
            ? `Deleted ${deletedCount} presentations, failed to delete ${failedCount} presentations`
            : "Failed to delete presentations",
        partialSuccess: deletedCount > 0,
      };
    }

    return {
      success: true,
      message:
        ids.length === 1
          ? "Presentation deleted successfully"
          : `${deletedCount} presentations deleted successfully`,
    };
  } catch (error) {
    console.error("Failed to delete presentations:", error);
    return {
      success: false,
      message: "Failed to delete presentations",
    };
  }
}

// Get the presentation with the presentation content
export async function getPresentation(id: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    const result = await presentationRepository.getPresentation(id, userId);

    if (!result) {
      return {
        success: false,
        message: "Presentation not found",
      };
    }

    return {
      success: true,
      presentation: {
        ...result.baseDoc,
        presentation: result.presentation,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

export async function getPresentationContent(id: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    const result = await presentationRepository.getPresentation(id, userId);

    if (!result) {
      return {
        success: false,
        message: "Presentation not found",
      };
    }

    // Check if the user has access to this presentation
    if (result.baseDoc.userId !== userId && !result.baseDoc.isPublic) {
      return {
        success: false,
        message: "Unauthorized access",
      };
    }

    return {
      success: true,
      presentation: result.presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

export async function updatePresentationTheme(id: string, theme: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    await presentationRepository.updatePresentation(id, userId, { theme });

    const updated = await presentationRepository.getPresentation(id, userId);

    return {
      success: true,
      message: "Presentation theme updated successfully",
      presentation: updated?.presentation,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to update presentation theme",
    };
  }
}

export async function duplicatePresentation(id: string, newTitle?: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  const userId = user.id;

  try {
    // Get the original presentation
    const original = await presentationRepository.getPresentation(id, userId);

    if (!original?.presentation) {
      return {
        success: false,
        message: "Original presentation not found",
      };
    }

    // Create a new presentation with the same content
    const duplicated = await presentationRepository.createPresentation({
      title: newTitle ?? `${original.baseDoc.title} (Copy)`,
      userId,
      content: original.presentation.content,
      theme: original.presentation.theme,
    });

    return {
      success: true,
      message: "Presentation duplicated successfully",
      presentation: {
        ...duplicated.baseDoc,
        presentation: duplicated.presentation,
      },
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Failed to duplicate presentation",
    };
  }
}
