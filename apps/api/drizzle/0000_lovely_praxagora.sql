CREATE TYPE "public"."application_status" AS ENUM('not_applied', 'applied', 'viewed', 'contacted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contract', 'internship');--> statement-breakpoint
CREATE TYPE "public"."generation_source" AS ENUM('initial', 'normal', 'offline_upload', 'online_backup', 'restore');--> statement-breakpoint
CREATE TYPE "public"."generation_state" AS ENUM('staging', 'active', 'backup', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."list_mode" AS ENUM('manual', 'column');--> statement-breakpoint
CREATE TYPE "public"."managed_file_kind" AS ENUM('company_logo', 'submitted_resume');--> statement-breakpoint
CREATE TYPE "public"."position_status" AS ENUM('saved', 'applied', 'screening', 'interviewing', 'assignment', 'paused', 'offer', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."sort_column" AS ENUM('company', 'title', 'status', 'workMode', 'seniority', 'updatedAt');--> statement-breakpoint
CREATE TYPE "public"."sort_direction" AS ENUM('asc', 'desc');--> statement-breakpoint
CREATE TYPE "public"."sync_direction" AS ENUM('offline_to_online', 'working_copy_to_online', 'online_to_offline', 'online_to_working_copy');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('uploading', 'validating', 'preview_ready', 'confirming', 'completed', 'cancelled', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"workspace_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	CONSTRAINT "departments_workspace_id_id_pk" PRIMARY KEY("workspace_id","id"),
	CONSTRAINT "department_sequence_uidx" UNIQUE("workspace_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "job_platform_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"position_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"platform_name" text NOT NULL,
	"url" text NOT NULL,
	"application_status" "application_status",
	"application_date" date,
	CONSTRAINT "platform_link_sequence_uidx" UNIQUE("workspace_id","position_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"workspace_id" uuid NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	CONSTRAINT "locations_workspace_id_id_pk" PRIMARY KEY("workspace_id","id"),
	CONSTRAINT "location_sequence_uidx" UNIQUE("workspace_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "managed_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"position_id" text NOT NULL,
	"kind" "managed_file_kind" NOT NULL,
	"original_file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"byte_length" bigint NOT NULL,
	"sha256" text NOT NULL,
	"object_key" text NOT NULL,
	"generation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managed_files_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "position_questions" (
	"workspace_id" uuid NOT NULL,
	"position_id" text NOT NULL,
	"id" text NOT NULL,
	"sequence" integer NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"custom_category" text,
	"answer" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "position_questions_workspace_id_position_id_id_pk" PRIMARY KEY("workspace_id","position_id","id"),
	CONSTRAINT "question_sequence_uidx" UNIQUE("workspace_id","position_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"workspace_id" uuid NOT NULL,
	"id" text NOT NULL,
	"sequence" integer NOT NULL,
	"company_name" text NOT NULL,
	"company_logo_url" text,
	"title" text NOT NULL,
	"status" "position_status" NOT NULL,
	"work_mode" "work_mode" NOT NULL,
	"employment_type" "employment_type" NOT NULL,
	"seniority" text NOT NULL,
	"department_id" text,
	"team_id" text,
	"location_id" text,
	"hiring_manager_name" text DEFAULT '' NOT NULL,
	"hiring_manager_phone" text DEFAULT '' NOT NULL,
	"hiring_manager_position" text DEFAULT '' NOT NULL,
	"salary_min" numeric,
	"salary_max" numeric,
	"salary_currency" text,
	"career_page_url" text,
	"career_application_status" "application_status",
	"career_application_date" date,
	"description" jsonb NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "positions_workspace_id_id_pk" PRIMARY KEY("workspace_id","id"),
	CONSTRAINT "position_sequence_uidx" UNIQUE("workspace_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "reading_items" (
	"workspace_id" uuid NOT NULL,
	"position_id" text NOT NULL,
	"id" text NOT NULL,
	"sequence" integer NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"notes" text DEFAULT '' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_items_workspace_id_position_id_id_pk" PRIMARY KEY("workspace_id","position_id","id"),
	CONSTRAINT "reading_sequence_uidx" UNIQUE("workspace_id","position_id","sequence")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "synchronization_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"direction" "sync_direction" NOT NULL,
	"status" "sync_status" NOT NULL,
	"source_revision" bigint,
	"expected_destination_revision" bigint,
	"source_checksum" text NOT NULL,
	"source_counts" jsonb NOT NULL,
	"destination_counts" jsonb NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"staging_generation_id" uuid,
	"backup_generation_id" uuid,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "sync_retry_uidx" UNIQUE("workspace_id","direction","source_checksum")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"workspace_id" uuid NOT NULL,
	"department_id" text NOT NULL,
	"id" text NOT NULL,
	"name" text NOT NULL,
	"sequence" integer NOT NULL,
	CONSTRAINT "teams_workspace_id_id_pk" PRIMARY KEY("workspace_id","id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"state" "generation_state" NOT NULL,
	"source_kind" "generation_source" NOT NULL,
	"source_revision" bigint,
	"package_format_version" integer NOT NULL,
	"package_checksum" text,
	"backup_object_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workspace_preferences" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"list_mode" "list_mode" DEFAULT 'manual' NOT NULL,
	"sort_column" "sort_column",
	"sort_direction" "sort_direction"
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"active_generation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_platform_links" ADD CONSTRAINT "job_platform_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_files" ADD CONSTRAINT "managed_files_generation_id_workspace_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."workspace_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_questions" ADD CONSTRAINT "position_questions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_items" ADD CONSTRAINT "reading_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synchronization_attempts" ADD CONSTRAINT "synchronization_attempts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synchronization_attempts" ADD CONSTRAINT "synchronization_attempts_staging_generation_id_workspace_generations_id_fk" FOREIGN KEY ("staging_generation_id") REFERENCES "public"."workspace_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synchronization_attempts" ADD CONSTRAINT "synchronization_attempts_backup_generation_id_workspace_generations_id_fk" FOREIGN KEY ("backup_generation_id") REFERENCES "public"."workspace_generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_generations" ADD CONSTRAINT "workspace_generations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_preferences" ADD CONSTRAINT "workspace_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "managed_file_owner_idx" ON "managed_files" USING btree ("workspace_id","position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submitted_resume_uidx" ON "managed_files" USING btree ("workspace_id","position_id") WHERE "managed_files"."kind" = 'submitted_resume';--> statement-breakpoint
CREATE INDEX "position_status_idx" ON "positions" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "position_updated_idx" ON "positions" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_workspace_idx" ON "synchronization_attempts" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "team_department_idx" ON "teams" USING btree ("workspace_id","department_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "generation_workspace_idx" ON "workspace_generations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_active_uidx" ON "workspace_generations" USING btree ("workspace_id") WHERE "workspace_generations"."state" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_owner_uidx" ON "workspaces" USING btree ("owner_id");