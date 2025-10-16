import { Agent } from "app-types/agent";
import { UserPreferences } from "app-types/user";
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  json,
  uuid,
  boolean,
  unique,
  varchar,
  index,
  integer,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { DBWorkflow, DBEdge, DBNode } from "app-types/workflow";
import { UIMessage } from "ai";
import { ChatMetadata } from "app-types/chat";

export const ChatThreadSchema = pgTable("chat_thread", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ChatMessageSchema = pgTable("chat_message", {
  id: text("id").primaryKey().notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => ChatThreadSchema.id),
  role: text("role").notNull().$type<UIMessage["role"]>(),
  parts: json("parts").notNull().array().$type<UIMessage["parts"]>(),
  metadata: json("metadata").$type<ChatMetadata>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const AgentSchema = pgTable("agent", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  icon: json("icon").$type<Agent["icon"]>(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id),
  instructions: json("instructions").$type<Agent["instructions"]>(),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const BookmarkSchema = pgTable(
  "bookmark",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    itemType: varchar("item_type", {
      enum: ["agent", "workflow"],
    }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.itemId, table.itemType),
    index("bookmark_user_id_idx").on(table.userId),
    index("bookmark_item_idx").on(table.itemId, table.itemType),
  ],
);

export const UserSchema = pgTable("user", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  password: text("password"),
  image: text("image"),
  preferences: json("preferences").default({}).$type<UserPreferences>(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const SessionSchema = pgTable("session", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
});

export const AccountSchema = pgTable("account", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const VerificationSchema = pgTable("verification", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const WorkflowSchema = pgTable("workflow", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  name: text("name").notNull(),
  icon: json("icon").$type<DBWorkflow["icon"]>(),
  description: text("description"),
  isPublished: boolean("is_published").notNull().default(false),
  visibility: varchar("visibility", {
    enum: ["public", "private", "readonly"],
  })
    .notNull()
    .default("private"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const WorkflowNodeDataSchema = pgTable(
  "workflow_node",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    version: text("version").notNull().default("0.1.0"),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    uiConfig: json("ui_config").$type<DBNode["uiConfig"]>().default({}),
    nodeConfig: json("node_config")
      .$type<Partial<DBNode["nodeConfig"]>>()
      .default({}),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("workflow_node_kind_idx").on(t.kind)],
);

export const WorkflowEdgeSchema = pgTable("workflow_edge", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  version: text("version").notNull().default("0.1.0"),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => WorkflowSchema.id, { onDelete: "cascade" }),
  source: uuid("source")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  target: uuid("target")
    .notNull()
    .references(() => WorkflowNodeDataSchema.id, { onDelete: "cascade" }),
  uiConfig: json("ui_config").$type<DBEdge["uiConfig"]>().default({}),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveSchema = pgTable("archive", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => UserSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ArchiveItemSchema = pgTable(
  "archive_item",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    archiveId: uuid("archive_id")
      .notNull()
      .references(() => ArchiveSchema.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("archive_item_item_id_idx").on(t.itemId)],
);

export type ChatThreadEntity = typeof ChatThreadSchema.$inferSelect;
export type ChatMessageEntity = typeof ChatMessageSchema.$inferSelect;

export type AgentEntity = typeof AgentSchema.$inferSelect;
export type UserEntity = typeof UserSchema.$inferSelect;

export type ArchiveEntity = typeof ArchiveSchema.$inferSelect;
export type ArchiveItemEntity = typeof ArchiveItemSchema.$inferSelect;
export type BookmarkEntity = typeof BookmarkSchema.$inferSelect;

// Token Usage Tracking Schemas
export const ApiUsageSchema = pgTable(
  "api_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => ChatThreadSchema.id, {
      onDelete: "set null",
    }),
    messageId: text("message_id").references(() => ChatMessageSchema.id, {
      onDelete: "set null",
    }),
    modelProvider: varchar("model_provider", { length: 50 }).notNull(),
    modelName: varchar("model_name", { length: 100 }).notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    inputCostUsd: decimal("input_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    outputCostUsd: decimal("output_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    cachedInputCostUsd: decimal("cached_input_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    reasoningCostUsd: decimal("reasoning_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    totalCostUsd: decimal("total_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    toolCallsCount: integer("tool_calls_count").notNull().default(0),
    toolCallsCostUsd: decimal("tool_calls_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    // Flag for prompt builder usage
    isPromptBuilder: boolean("is_prompt_builder").notNull().default(false),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("api_usage_user_id_idx").on(table.userId),
    index("api_usage_created_at_idx").on(table.createdAt),
    index("api_usage_thread_id_idx").on(table.threadId),
  ],
);

export const UserDailyUsageSchema = pgTable(
  "user_daily_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    usageDate: date("usage_date").notNull(),
    totalTokens: integer("total_tokens").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalCostUsd: decimal("total_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    apiCallsCount: integer("api_calls_count").notNull().default(0),
    toolCallsCount: integer("tool_calls_count").notNull().default(0),
    toolCallsCostUsd: decimal("tool_calls_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    // Tool-specific usage tracking
    imageGenerationsCount: integer("image_generations_count")
      .notNull()
      .default(0),
    videoGenerationsCount: integer("video_generations_count")
      .notNull()
      .default(0),
    webSearchesCount: integer("web_searches_count").notNull().default(0),
    // Prompt builder usage tracking
    promptBuilderTokensUsed: integer("prompt_builder_tokens_used")
      .notNull()
      .default(0),
    promptBuilderCostUsd: decimal("prompt_builder_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.usageDate),
    index("user_daily_usage_user_date_idx").on(table.userId, table.usageDate),
  ],
);

export const UserMonthlyUsageSchema = pgTable(
  "user_monthly_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    usageMonth: integer("usage_month").notNull(),
    usageYear: integer("usage_year").notNull(),
    totalTokens: integer("total_tokens").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalCostUsd: decimal("total_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    apiCallsCount: integer("api_calls_count").notNull().default(0),
    toolCallsCount: integer("tool_calls_count").notNull().default(0),
    toolCallsCostUsd: decimal("tool_calls_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    // Tool-specific usage tracking
    imageGenerationsCount: integer("image_generations_count")
      .notNull()
      .default(0),
    videoGenerationsCount: integer("video_generations_count")
      .notNull()
      .default(0),
    webSearchesCount: integer("web_searches_count").notNull().default(0),
    // Prompt builder usage tracking
    promptBuilderTokensUsed: integer("prompt_builder_tokens_used")
      .notNull()
      .default(0),
    promptBuilderCostUsd: decimal("prompt_builder_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.usageMonth, table.usageYear),
    index("user_monthly_usage_user_period_idx").on(
      table.userId,
      table.usageYear,
      table.usageMonth,
    ),
  ],
);

export const ThreadUsageSchema = pgTable(
  "thread_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => ChatThreadSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    totalTokens: integer("total_tokens").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalCostUsd: decimal("total_cost_usd", { precision: 10, scale: 8 })
      .notNull()
      .default("0"),
    apiCallsCount: integer("api_calls_count").notNull().default(0),
    toolCallsCount: integer("tool_calls_count").notNull().default(0),
    toolCallsCostUsd: decimal("tool_calls_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    // Prompt builder usage tracking
    promptBuilderTokensUsed: integer("prompt_builder_tokens_used")
      .notNull()
      .default(0),
    promptBuilderCostUsd: decimal("prompt_builder_cost_usd", {
      precision: 10,
      scale: 8,
    })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.threadId),
    index("thread_usage_user_id_idx").on(table.userId),
  ],
);

// Export types for the new schemas
// Subscription Management Schemas
export const SubscriptionSchema = pgTable(
  "subscription",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id").notNull(),
    planType: varchar("plan_type", {
      enum: ["free", "plus", "pro", "max"],
    })
      .notNull()
      .default("free"),
    status: varchar("status", {
      enum: [
        "active",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "past_due",
        "trialing",
        "unpaid",
      ],
    }).notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("subscription_user_id_idx").on(table.userId),
    index("subscription_stripe_customer_id_idx").on(table.stripeCustomerId),
    index("subscription_status_idx").on(table.status),
  ],
);

export const SubscriptionLimitsSchema = pgTable("subscription_limits", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  planType: varchar("plan_type", {
    enum: ["free", "plus", "pro", "max"],
  })
    .notNull()
    .unique(),
  maxTokensPerMonth: integer("max_tokens_per_month").notNull().default(0),
  maxApiCallsPerMonth: integer("max_api_calls_per_month").notNull().default(0),
  maxToolCallsPerMonth: integer("max_tool_calls_per_month")
    .notNull()
    .default(0),
  maxPromptBuilderTokensPerDay: integer("max_prompt_builder_tokens_per_day")
    .notNull()
    .default(0),
  hasFileUploads: boolean("has_file_uploads").notNull().default(false),
  hasAdvancedFeatures: boolean("has_advanced_features")
    .notNull()
    .default(false),
  hasApiAccess: boolean("has_api_access").notNull().default(false),
  hasPrioritySupport: boolean("has_priority_support").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const UserSubscriptionUsageSchema = pgTable(
  "user_subscription_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => SubscriptionSchema.id, { onDelete: "cascade" }),
    usageMonth: integer("usage_month").notNull(),
    usageYear: integer("usage_year").notNull(),
    tokensUsed: integer("tokens_used").notNull().default(0),
    apiCallsUsed: integer("api_calls_used").notNull().default(0),
    toolCallsUsed: integer("tool_calls_used").notNull().default(0),
    resetAt: timestamp("reset_at").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.usageMonth, table.usageYear),
    index("user_subscription_usage_user_period_idx").on(
      table.userId,
      table.usageYear,
      table.usageMonth,
    ),
  ],
);

// Environmental Usage Tracking Schema
export const EnvironmentalUsageSchema = pgTable(
  "environmental_usage",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => UserSchema.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    totalWaterMl: decimal("total_water_ml", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    totalEnergyWh: decimal("total_energy_wh", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    unique().on(table.userId, table.year, table.month),
    index("environmental_usage_user_id_idx").on(table.userId),
    index("environmental_usage_year_month_idx").on(table.year, table.month),
    index("environmental_usage_user_year_month_idx").on(
      table.userId,
      table.year,
      table.month,
    ),
  ],
);

// Export types for the new schemas
export type ApiUsageEntity = typeof ApiUsageSchema.$inferSelect;
export type UserDailyUsageEntity = typeof UserDailyUsageSchema.$inferSelect;
export type UserMonthlyUsageEntity = typeof UserMonthlyUsageSchema.$inferSelect;
export type ThreadUsageEntity = typeof ThreadUsageSchema.$inferSelect;
export type SubscriptionEntity = typeof SubscriptionSchema.$inferSelect;
export type SubscriptionLimitsEntity =
  typeof SubscriptionLimitsSchema.$inferSelect;
export type UserSubscriptionUsageEntity =
  typeof UserSubscriptionUsageSchema.$inferSelect;
export type EnvironmentalUsageEntity =
  typeof EnvironmentalUsageSchema.$inferSelect;
