import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./client";

const migrationsFolder = path.join(process.cwd(), "lib", "db", "migrations");

migrate(db, { migrationsFolder });
console.log("✓ migrations applied");
