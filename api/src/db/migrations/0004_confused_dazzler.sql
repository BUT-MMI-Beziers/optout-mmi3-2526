ALTER TYPE "public"."request_status" ADD VALUE 'PENDING' BEFORE 'SENT';--> statement-breakpoint
ALTER TABLE "brokers" ALTER COLUMN "opt_out_method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."opt_out_method";--> statement-breakpoint
CREATE TYPE "public"."opt_out_method" AS ENUM('email', 'form', 'mixed');--> statement-breakpoint
ALTER TABLE "brokers" ALTER COLUMN "opt_out_method" SET DATA TYPE "public"."opt_out_method" USING "opt_out_method"::"public"."opt_out_method";--> statement-breakpoint
ALTER TABLE "removal_requests" ADD COLUMN "scheduled_at" timestamp;