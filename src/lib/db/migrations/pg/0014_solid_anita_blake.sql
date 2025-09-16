DROP TABLE "mcp_oauth_session" CASCADE;--> statement-breakpoint
DROP TABLE "mcp_server_custom_instructions" CASCADE;--> statement-breakpoint
DROP TABLE "mcp_server" CASCADE;--> statement-breakpoint
DROP TABLE "mcp_server_tool_custom_instructions" CASCADE;--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD COLUMN "image_generations_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD COLUMN "video_generations_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD COLUMN "web_searches_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_monthly_usage" ADD COLUMN "image_generations_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_monthly_usage" ADD COLUMN "video_generations_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_monthly_usage" ADD COLUMN "web_searches_count" integer DEFAULT 0 NOT NULL;