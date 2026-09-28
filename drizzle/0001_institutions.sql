CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_name_key_uq" ON "institutions" USING btree ("name_key");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "institutions" TO ujer_app;