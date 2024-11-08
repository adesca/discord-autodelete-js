import { sqliteTable, text, int } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable('channels', {
    // IDs are snowflakes, which are guaranteed to be numbers and increasing
    // However they're bigInts, so they can't be stored as numbers
    // https://medium.com/netcord/discord-snowflake-explained-id-generation-process-a468be00a570
    channelId: text().primaryKey(),
    durationInMs: int().notNull(),
    initialAutoDeleteMessageId: text().notNull()
})

export const messages = sqliteTable('messages', {
    channelId: text().references(() => channels.channelId, {onDelete: 'cascade'}).notNull(),
    messageId: text().notNull(),
    deleteAt: int().notNull()
})