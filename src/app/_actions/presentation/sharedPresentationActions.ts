"use server";

import { getUser } from "@/lib/auth/supabase-auth";
import { db } from "@/lib/db";
import { BaseDocumentSchema, PresentationSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";

/**
 * Get a public presentation without requiring authentication
 * This is used for the shared presentation view
 */
export async function getSharedPresentation(id: string) {
  try {
    const result = await db
      .select({
        baseDoc: BaseDocumentSchema,
        presentation: PresentationSchema,
        user: {
          name: UserSchema.name,
          image: UserSchema.image,
        },
      })
      .from(BaseDocumentSchema)
      .leftJoin(PresentationSchema, eq(BaseDocumentSchema.id, PresentationSchema.id))
      .leftJoin(UserSchema, eq(BaseDocumentSchema.userId, UserSchema.id))
      .where(
        and(
          eq(BaseDocumentSchema.id, id),
          eq(BaseDocumentSchema.isPublic, true)
        )
      )
      .limit(1);

    const presentation = result[0];

    if (!presentation) {
      return {
        success: false,
        message: "Presentation not found or not public",
      };
    }

    return {
      success: true,
      presentation: {
        ...presentation.baseDoc,
        presentation: presentation.presentation,
        user: presentation.user,
      },
    };
  } catch (error) {
    console.error("Error fetching shared presentation:", error);
    return {
      success: false,
      message: "Failed to fetch presentation",
    };
  }
}

/**
 * Toggle the public status of a presentation
 */
export async function togglePresentationPublicStatus(
  id: string,
  isPublic: boolean,
) {
  const user = await getUser();
  if (!user) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }
  const userId = user.id;

  try {
    // This requires auth and ownership verification
    const result = await db
      .update(BaseDocumentSchema)
      .set({ isPublic, updatedAt: new Date() })
      .where(
        and(
          eq(BaseDocumentSchema.id, id),
          eq(BaseDocumentSchema.userId, userId)
        )
      )
      .returning();

    const presentation = result[0];

    if (!presentation) {
      return {
        success: false,
        message: "Presentation not found or unauthorized",
      };
    }

    return {
      success: true,
      message: isPublic
        ? "Presentation is now publicly accessible"
        : "Presentation is now private",
      presentation,
    };
  } catch (error) {
    console.error("Error updating presentation public status:", error);
    return {
      success: false,
      message: "Failed to update presentation public status",
    };
  }
}
