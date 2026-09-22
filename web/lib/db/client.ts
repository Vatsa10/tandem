import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Connected on first query, not at import. Building the app imports every
// route module to collect page data, so an eager `neon(env.DATABASE_URL)`
// here made `next build` fail with "Missing required env var: DATABASE_URL"
// on any machine without the production database — CI included. Nothing is
// gained by connecting before a query is actually issued.
type Database = ReturnType<typeof drizzle<typeof schema>>;

let instance: Database | undefined;

function getDb(): Database {
  if (!instance) {
    instance = drizzle(neon(env.DATABASE_URL), { schema });
  }
  return instance;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    return Reflect.get(getDb(), property, receiver);
  },
});
