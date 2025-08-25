-- Token Usage Tracking Tables
-- Migration: 0013_token_usage_tracking.sql

-- Table to track individual API calls and their costs
CREATE TABLE IF NOT EXISTS "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"thread_id" uuid REFERENCES "chat_thread"("id") ON DELETE SET NULL,
	"message_id" text REFERENCES "chat_message"("id") ON DELETE SET NULL,
	"model_provider" varchar(50) NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"input_tokens" integer NOT NULL DEFAULT 0,
	"output_tokens" integer NOT NULL DEFAULT 0,
	"cached_input_tokens" integer NOT NULL DEFAULT 0,
	"reasoning_tokens" integer NOT NULL DEFAULT 0,
	"total_tokens" integer NOT NULL DEFAULT 0,
	"input_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"output_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"cached_input_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"reasoning_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"total_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"tool_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table to track daily usage summaries per user
CREATE TABLE IF NOT EXISTS "user_daily_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"usage_date" date NOT NULL,
	"total_tokens" integer NOT NULL DEFAULT 0,
	"input_tokens" integer NOT NULL DEFAULT 0,
	"output_tokens" integer NOT NULL DEFAULT 0,
	"cached_input_tokens" integer NOT NULL DEFAULT 0,
	"reasoning_tokens" integer NOT NULL DEFAULT 0,
	"total_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"api_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	UNIQUE("user_id", "usage_date")
);

-- Table to track monthly usage summaries per user
CREATE TABLE IF NOT EXISTS "user_monthly_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"usage_month" integer NOT NULL, -- 1-12
	"usage_year" integer NOT NULL,
	"total_tokens" integer NOT NULL DEFAULT 0,
	"input_tokens" integer NOT NULL DEFAULT 0,
	"output_tokens" integer NOT NULL DEFAULT 0,
	"cached_input_tokens" integer NOT NULL DEFAULT 0,
	"reasoning_tokens" integer NOT NULL DEFAULT 0,
	"total_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"api_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	UNIQUE("user_id", "usage_month", "usage_year")
);

-- Table to track per-thread usage summaries
CREATE TABLE IF NOT EXISTS "thread_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL REFERENCES "chat_thread"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"total_tokens" integer NOT NULL DEFAULT 0,
	"input_tokens" integer NOT NULL DEFAULT 0,
	"output_tokens" integer NOT NULL DEFAULT 0,
	"cached_input_tokens" integer NOT NULL DEFAULT 0,
	"reasoning_tokens" integer NOT NULL DEFAULT 0,
	"total_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"api_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_count" integer NOT NULL DEFAULT 0,
	"tool_calls_cost_usd" decimal(10,8) NOT NULL DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	UNIQUE("thread_id")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "api_usage_user_id_idx" ON "api_usage"("user_id");
CREATE INDEX IF NOT EXISTS "api_usage_created_at_idx" ON "api_usage"("created_at");
CREATE INDEX IF NOT EXISTS "api_usage_thread_id_idx" ON "api_usage"("thread_id");
CREATE INDEX IF NOT EXISTS "user_daily_usage_user_date_idx" ON "user_daily_usage"("user_id", "usage_date");
CREATE INDEX IF NOT EXISTS "user_monthly_usage_user_period_idx" ON "user_monthly_usage"("user_id", "usage_year", "usage_month");
CREATE INDEX IF NOT EXISTS "thread_usage_user_id_idx" ON "thread_usage"("user_id");