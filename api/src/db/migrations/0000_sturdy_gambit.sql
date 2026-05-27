CREATE TYPE "public"."broker_category" AS ENUM('people-search', 'marketing', 'risk-mitigation', 'recruitment', 'other');--> statement-breakpoint
CREATE TYPE "public"."broker_difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."broker_region" AS ENUM('eu', 'us', 'global');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('email', 'phone', 'address');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('created', 'sent', 'reminder_sent', 'status_changed', 'note_added');--> statement-breakpoint
CREATE TYPE "public"."legal_basis" AS ENUM('gdpr_art17', 'gdpr_art15', 'ccpa', 'pipeda', 'other');--> statement-breakpoint
CREATE TYPE "public"."opt_out_method" AS ENUM('email', 'form', 'postal', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETED', 'REFUSED', 'NO_RESPONSE', 'COMPLAINT', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "brokers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"email_contact" varchar(255) NOT NULL,
	"website" varchar(500),
	"opt_out_url" varchar(500),
	"category" "broker_category" NOT NULL,
	"region" "broker_region" NOT NULL,
	"country" varchar(2),
	"opt_out_method" "opt_out_method" NOT NULL,
	"difficulty" "broker_difficulty" NOT NULL,
	"legal_basis" "legal_basis" NOT NULL,
	"notes" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brokers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"legal_basis" "legal_basis" NOT NULL,
	"language" varchar(5) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "removal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"broker_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"status" "request_status" DEFAULT 'DRAFT' NOT NULL,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"next_action_at" timestamp,
	"email_body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"old_status" "request_status",
	"new_status" "request_status",
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "contact_type" NOT NULL,
	"value" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"label" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_removal_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."removal_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_broker_id_brokers_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."brokers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_request_id_removal_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."removal_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;