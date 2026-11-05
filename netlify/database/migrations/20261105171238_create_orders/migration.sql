CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"ref" text NOT NULL UNIQUE,
	"status" text DEFAULT 'new' NOT NULL,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"governorate" text NOT NULL,
	"wilayat" text NOT NULL,
	"address" text NOT NULL,
	"vin" text,
	"notes" text DEFAULT '' NOT NULL,
	"payment_method" text NOT NULL,
	"lang" text DEFAULT 'ar' NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal_baisa" integer NOT NULL,
	"delivery_baisa" integer NOT NULL,
	"total_baisa" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" ("created_at");