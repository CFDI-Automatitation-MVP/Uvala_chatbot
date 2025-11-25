import { db } from "@/lib/db";
import { BaseDocumentSchema, PresentationSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, desc, inArray } from "drizzle-orm";

export const presentationRepository = {
  // Create presentation
  async createPresentation(data: {
    title: string;
    userId: string;
    content: any;
    theme?: string;
    imageSource?: string;
    outline?: string[];
    presentationStyle?: string;
    language?: string;
  }) {
    return await db.transaction(async (tx) => {
      // Create base document
      const [baseDoc] = await tx
        .insert(BaseDocumentSchema)
        .values({
          title: data.title,
          type: "PRESENTATION",
          documentType: "presentation",
          userId: data.userId,
        })
        .returning();

      // Create presentation
      const [presentation] = await tx
        .insert(PresentationSchema)
        .values({
          id: baseDoc.id,
          content: data.content,
          theme: data.theme || "default",
          imageSource: data.imageSource || "stock",
          outline: data.outline,
          presentationStyle: data.presentationStyle,
          language: data.language || "en-US",
        })
        .returning();

      return { baseDoc, presentation };
    });
  },

  // Get presentation by ID
  async getPresentation(id: string, userId: string) {
    const result = await db
      .select()
      .from(BaseDocumentSchema)
      .leftJoin(
        PresentationSchema,
        eq(BaseDocumentSchema.id, PresentationSchema.id),
      )
      .where(
        and(
          eq(BaseDocumentSchema.id, id),
          eq(BaseDocumentSchema.userId, userId),
        ),
      )
      .limit(1);

    return result[0] || null;
  },

  // Get all presentations for user
  async getUserPresentations(userId: string) {
    return await db
      .select()
      .from(BaseDocumentSchema)
      .leftJoin(
        PresentationSchema,
        eq(BaseDocumentSchema.id, PresentationSchema.id),
      )
      .where(eq(BaseDocumentSchema.userId, userId))
      .orderBy(desc(BaseDocumentSchema.createdAt));
  },

  // Update presentation
  async updatePresentation(
    id: string,
    userId: string,
    data: {
      title?: string;
      content?: any;
      theme?: string;
      thumbnailUrl?: string;
      outline?: string[];
      prompt?: string;
      searchResults?: any;
    },
  ) {
    return await db.transaction(async (tx) => {
      // Update base document
      if (data.title || data.thumbnailUrl) {
        await tx
          .update(BaseDocumentSchema)
          .set({
            ...(data.title && { title: data.title }),
            ...(data.thumbnailUrl && { thumbnailUrl: data.thumbnailUrl }),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(BaseDocumentSchema.id, id),
              eq(BaseDocumentSchema.userId, userId),
            ),
          );
      }

      // Update presentation
      const presentationData: any = {};
      if (data.content) presentationData.content = data.content;
      if (data.theme) presentationData.theme = data.theme;
      if (data.outline) presentationData.outline = data.outline;
      if (data.prompt) presentationData.prompt = data.prompt;
      if (data.searchResults)
        presentationData.searchResults = data.searchResults;

      if (Object.keys(presentationData).length > 0) {
        await tx
          .update(PresentationSchema)
          .set(presentationData)
          .where(eq(PresentationSchema.id, id));
      }

      return { success: true };
    });
  },

  // Delete presentation
  async deletePresentation(id: string, userId: string) {
    // Base document cascade delete will handle presentation
    const result = await db
      .delete(BaseDocumentSchema)
      .where(
        and(
          eq(BaseDocumentSchema.id, id),
          eq(BaseDocumentSchema.userId, userId),
        ),
      )
      .returning();

    return result.length > 0;
  },

  // Delete multiple presentations
  async deletePresentations(ids: string[], userId: string) {
    const result = await db
      .delete(BaseDocumentSchema)
      .where(
        and(
          eq(BaseDocumentSchema.userId, userId),
          inArray(BaseDocumentSchema.id, ids),
        ),
      )
      .returning();

    return result.length;
  },
};
