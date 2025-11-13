CREATE TABLE "base_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"document_type" text NOT NULL,
	"user_id" uuid NOT NULL,
	"thumbnail_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_theme" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_id" uuid NOT NULL,
	"logo_url" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"theme_data" json NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environmental_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_water_ml" numeric(15, 4) DEFAULT '0' NOT NULL,
	"total_energy_wh" numeric(15, 4) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "environmental_usage_user_id_year_month_unique" UNIQUE("user_id","year","month")
);
--> statement-breakpoint
CREATE TABLE "favorite_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "favorite_document_user_id_document_id_unique" UNIQUE("user_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "generated_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"prompt" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presentation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content" json NOT NULL,
	"theme" text DEFAULT 'default' NOT NULL,
	"image_source" text DEFAULT 'stock' NOT NULL,
	"prompt" text,
	"presentation_style" text,
	"language" text DEFAULT 'en-US',
	"outline" json,
	"search_results" json,
	"template_id" text,
	"custom_theme_id" uuid
);
--> statement-breakpoint
ALTER TABLE "api_usage" ADD COLUMN "is_prompt_builder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_limits" ADD COLUMN "max_prompt_builder_tokens_per_day" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "thread_usage" ADD COLUMN "prompt_builder_tokens_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "thread_usage" ADD COLUMN "prompt_builder_cost_usd" numeric(10, 8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD COLUMN "prompt_builder_tokens_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD COLUMN "prompt_builder_cost_usd" numeric(10, 8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_monthly_usage" ADD COLUMN "prompt_builder_tokens_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_monthly_usage" ADD COLUMN "prompt_builder_cost_usd" numeric(10, 8) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "base_document" ADD CONSTRAINT "base_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_theme" ADD CONSTRAINT "custom_theme_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environmental_usage" ADD CONSTRAINT "environmental_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_document" ADD CONSTRAINT "favorite_document_document_id_base_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."base_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_document" ADD CONSTRAINT "favorite_document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_image" ADD CONSTRAINT "generated_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presentation" ADD CONSTRAINT "presentation_id_base_document_id_fk" FOREIGN KEY ("id") REFERENCES "public"."base_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_theme_user_id_idx" ON "custom_theme" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "environmental_usage_user_id_idx" ON "environmental_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "environmental_usage_year_month_idx" ON "environmental_usage" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "environmental_usage_user_year_month_idx" ON "environmental_usage" USING btree ("user_id","year","month");