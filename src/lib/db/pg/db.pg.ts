import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from './schema.pg';

// Supabase connection with postgres-js
const client = postgres(process.env.POSTGRES_URL!, {
  max: 20,
  idle_timeout: 30,
  max_lifetime: 60 * 30
});

export const pgDb = drizzle(client, { schema });
