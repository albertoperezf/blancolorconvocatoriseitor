CREATE TYPE "public"."position" AS ENUM('portero', 'defensa', 'mediocampo', 'delantero');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "position" "position";