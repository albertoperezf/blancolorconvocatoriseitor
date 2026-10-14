CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(60) NOT NULL,
	"email" varchar(120) NOT NULL,
	"message" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
