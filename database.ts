import { drizzle } from "drizzle-orm/libsql";

// todo change to database when this is done
export const database = drizzle('file:./db/local.db')