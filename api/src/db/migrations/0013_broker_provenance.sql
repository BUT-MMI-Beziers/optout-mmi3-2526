ALTER TABLE "brokers" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "brokers" ADD COLUMN "verified_by" uuid;--> statement-breakpoint
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "brokers" SET "is_verified" = true, "last_verified_at" = now() WHERE "created_by" IS NULL AND "is_verified" = false;
