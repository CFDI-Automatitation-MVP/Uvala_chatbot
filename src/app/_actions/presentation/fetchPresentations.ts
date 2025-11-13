"use server";
import "server-only";

import { getUser } from "@/lib/auth/supabase-auth";
import { db } from "@/lib/db";
import { BaseDocumentSchema, PresentationSchema, UserSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, desc, or } from "drizzle-orm";

const ITEMS_PER_PAGE = 10;

export async function fetchPresentations(page = 0) {
  const user = await getUser();
  const userId = user?.id;

  if (!userId) {
    return {
      items: [],
      hasMore: false,
    };
  }

  const skip = page * ITEMS_PER_PAGE;

  const items = await db
    .select()
    .from(BaseDocumentSchema)
    .where(
      and(
        eq(BaseDocumentSchema.userId, userId),
        eq(BaseDocumentSchema.type, "PRESENTATION")
      )
    )
    .orderBy(desc(BaseDocumentSchema.updatedAt))
    .limit(ITEMS_PER_PAGE)
    .offset(skip);

  const hasMore = items.length === ITEMS_PER_PAGE;

  return {
    items,
    hasMore,
  };
}

export async function fetchPublicPresentations(page = 0) {
  const skip = page * ITEMS_PER_PAGE;

  const items = await db
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
        eq(BaseDocumentSchema.type, "PRESENTATION"),
        eq(BaseDocumentSchema.isPublic, true)
      )
    )
    .orderBy(desc(BaseDocumentSchema.updatedAt))
    .limit(ITEMS_PER_PAGE)
    .offset(skip);

  // Get total count
  const totalResult = await db
    .select({ count: BaseDocumentSchema.id })
    .from(BaseDocumentSchema)
    .where(
      and(
        eq(BaseDocumentSchema.type, "PRESENTATION"),
        eq(BaseDocumentSchema.isPublic, true)
      )
    );

  const total = totalResult.length;
  const hasMore = skip + ITEMS_PER_PAGE < total;

  return {
    items: items.map((item) => ({
      ...item.baseDoc,
      presentation: item.presentation,
      user: item.user,
    })),
    hasMore,
  };
}

export async function fetchUserPresentations(userId: string, page = 0) {
  const user = await getUser();
  const currentUserId = user?.id;

  const skip = page * ITEMS_PER_PAGE;

  const items = await db
    .select({
      baseDoc: BaseDocumentSchema,
      presentation: PresentationSchema,
    })
    .from(BaseDocumentSchema)
    .leftJoin(PresentationSchema, eq(BaseDocumentSchema.id, PresentationSchema.id))
    .where(
      and(
        eq(BaseDocumentSchema.userId, userId),
        eq(BaseDocumentSchema.type, "PRESENTATION"),
        or(
          eq(BaseDocumentSchema.isPublic, true),
          currentUserId ? eq(BaseDocumentSchema.userId, currentUserId) : undefined
        )
      )
    )
    .orderBy(desc(BaseDocumentSchema.updatedAt))
    .limit(ITEMS_PER_PAGE)
    .offset(skip);

  // Get total count
  const totalResult = await db
    .select({ count: BaseDocumentSchema.id })
    .from(BaseDocumentSchema)
    .where(
      and(
        eq(BaseDocumentSchema.userId, userId),
        eq(BaseDocumentSchema.type, "PRESENTATION"),
        or(
          eq(BaseDocumentSchema.isPublic, true),
          currentUserId ? eq(BaseDocumentSchema.userId, currentUserId) : undefined
        )
      )
    );

  const total = totalResult.length;
  const hasMore = skip + ITEMS_PER_PAGE < total;

  return {
    items: items.map((item) => ({
      ...item.baseDoc,
      presentation: item.presentation,
    })),
    hasMore,
  };
}
