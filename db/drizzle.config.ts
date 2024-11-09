import { defineConfig } from 'drizzle-kit';

if (!process.env.DB_URL) throw new Error("DB_URL not set")

export default defineConfig({
  out: './db/drizzle',
  schema: './db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_URL
  },
});