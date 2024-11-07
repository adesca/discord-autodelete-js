import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable('channels', {
    channelId: text().primaryKey(),
    durationInMs: int().notNull(),
    after: text().notNull()
})

export const messages = sqliteTable('messages', {
    channelId: text().references(() => channels.channelId, {onDelete: 'cascade'}).notNull(),
    messageId: int().notNull(),
    deleteAt: int().notNull()
})