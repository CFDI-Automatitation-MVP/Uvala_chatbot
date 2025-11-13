"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { getUser } from "@/lib/auth/supabase-auth";
import { db } from "@/lib/db";
import { CustomThemeSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

// Schema for creating/updating a theme
const themeSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  themeData: z.any(), // We'll validate this as ThemeProperties in the function
  logoUrl: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

export type ThemeFormData = z.infer<typeof themeSchema>;

// Create a new custom theme
export async function createCustomTheme(formData: ThemeFormData) {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "You must be signed in to create a theme",
      };
    }
    const userId = user.id;

    const validatedData = themeSchema.parse(formData);

    const [newTheme] = await db
      .insert(CustomThemeSchema)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        themeData: validatedData.themeData,
        logoUrl: validatedData.logoUrl,
        isPublic: validatedData.isPublic ?? false,
        userId,
      })
      .returning();

    return {
      success: true,
      themeId: newTheme!.id,
      message: "Theme created successfully",
    };
  } catch (error) {
    console.error("Failed to create custom theme:", error);

    // Log the actual error but return a generic message
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid theme data. Please check your inputs and try again.",
      };
    } else {
      return {
        success: false,
        message: "Something went wrong. Please try again later.",
      };
    }
  }
}

// Update an existing custom theme
export async function updateCustomTheme(
  themeId: string,
  formData: ThemeFormData,
) {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "You must be signed in to update a theme",
      };
    }
    const userId = user.id;

    const validatedData = themeSchema.parse(formData);

    // Verify ownership
    const existingTheme = await db
      .select()
      .from(CustomThemeSchema)
      .where(eq(CustomThemeSchema.id, themeId))
      .limit(1);

    if (!existingTheme[0]) {
      return { success: false, message: "Theme not found" };
    }

    if (existingTheme[0].userId !== userId) {
      return { success: false, message: "Not authorized to update this theme" };
    }

    await db
      .update(CustomThemeSchema)
      .set({
        name: validatedData.name,
        description: validatedData.description,
        themeData: validatedData.themeData,
        logoUrl: validatedData.logoUrl,
        isPublic: validatedData.isPublic,
        updatedAt: new Date(),
      })
      .where(eq(CustomThemeSchema.id, themeId));

    return {
      success: true,
      message: "Theme updated successfully",
    };
  } catch (error) {
    console.error("Failed to update custom theme:", error);

    // Log the actual error but return a generic message
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Invalid theme data. Please check your inputs and try again.",
      };
    } else {
      return {
        success: false,
        message: "Something went wrong. Please try again later.",
      };
    }
  }
}

// Delete a custom theme
export async function deleteCustomTheme(themeId: string) {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "You must be signed in to delete a theme",
      };
    }
    const userId = user.id;

    // Verify ownership
    const existingTheme = await db
      .select()
      .from(CustomThemeSchema)
      .where(eq(CustomThemeSchema.id, themeId))
      .limit(1);

    if (!existingTheme[0]) {
      return { success: false, message: "Theme not found" };
    }

    if (existingTheme[0].userId !== userId) {
      return { success: false, message: "Not authorized to delete this theme" };
    }

    // Delete logo from uploadthing if exists
    if (existingTheme[0].logoUrl) {
      try {
        const fileKey = existingTheme[0].logoUrl.split("/").pop();
        if (fileKey) {
          await utapi.deleteFiles(fileKey);
        }
      } catch (deleteError) {
        console.error("Failed to delete theme logo:", deleteError);
        // Continue with theme deletion even if logo deletion fails
      }
    }

    await db
      .delete(CustomThemeSchema)
      .where(eq(CustomThemeSchema.id, themeId));

    return {
      success: true,
      message: "Theme deleted successfully",
    };
  } catch (error) {
    console.error("Failed to delete custom theme:", error);
    return {
      success: false,
      message:
        "Something went wrong while deleting the theme. Please try again later.",
    };
  }
}

// Get all custom themes for the current user
export async function getUserCustomThemes() {
  try {
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        message: "You must be signed in to view your themes",
        themes: [],
      };
    }
    const userId = user.id;

    const themes = await db
      .select()
      .from(CustomThemeSchema)
      .where(eq(CustomThemeSchema.userId, userId))
      .orderBy(desc(CustomThemeSchema.createdAt));

    return {
      success: true,
      themes,
    };
  } catch (error) {
    console.error("Failed to fetch custom themes:", error);
    return {
      success: false,
      message: "Unable to load themes at this time. Please try again later.",
      themes: [],
    };
  }
}

// Get all public themes
export async function getPublicCustomThemes() {
  try {
    const themes = await db
      .select({
        id: CustomThemeSchema.id,
        name: CustomThemeSchema.name,
        description: CustomThemeSchema.description,
        themeData: CustomThemeSchema.themeData,
        logoUrl: CustomThemeSchema.logoUrl,
        isPublic: CustomThemeSchema.isPublic,
        userId: CustomThemeSchema.userId,
        createdAt: CustomThemeSchema.createdAt,
        updatedAt: CustomThemeSchema.updatedAt,
        user: {
          name: UserSchema.name,
        },
      })
      .from(CustomThemeSchema)
      .leftJoin(UserSchema, eq(CustomThemeSchema.userId, UserSchema.id))
      .where(eq(CustomThemeSchema.isPublic, true))
      .orderBy(desc(CustomThemeSchema.createdAt));

    return {
      success: true,
      themes,
    };
  } catch (error) {
    console.error("Failed to fetch public themes:", error);
    return {
      success: false,
      message:
        "Unable to load public themes at this time. Please try again later.",
      themes: [],
    };
  }
}

// Get a single theme by ID
export async function getCustomThemeById(themeId: string) {
  try {
    const result = await db
      .select({
        id: CustomThemeSchema.id,
        name: CustomThemeSchema.name,
        description: CustomThemeSchema.description,
        themeData: CustomThemeSchema.themeData,
        logoUrl: CustomThemeSchema.logoUrl,
        isPublic: CustomThemeSchema.isPublic,
        userId: CustomThemeSchema.userId,
        createdAt: CustomThemeSchema.createdAt,
        updatedAt: CustomThemeSchema.updatedAt,
        user: {
          name: UserSchema.name,
        },
      })
      .from(CustomThemeSchema)
      .leftJoin(UserSchema, eq(CustomThemeSchema.userId, UserSchema.id))
      .where(eq(CustomThemeSchema.id, themeId))
      .limit(1);

    const theme = result[0];

    if (!theme) {
      return { success: false, message: "Theme not found" };
    }

    return {
      success: true,
      theme,
    };
  } catch (error) {
    console.error("Failed to fetch theme:", error);
    return {
      success: false,
      message: "Unable to load the theme at this time. Please try again later.",
    };
  }
}
