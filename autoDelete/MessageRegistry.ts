import { Message, TextChannel } from "discord.js";
import { database } from "../database";
import { channels as channelsDB, messages } from "../db/schema";
import { eq, lte } from "drizzle-orm/sqlite-core/expressions";
import { AuditLogs } from "./auditLogs";
/* 
    Manages database entries for autodelete channels and messages pending deletion.
    This class must be constructed using its `open` factory method,
    and may be used as a context manager to commit or rollback database edits on exit.
    Note that, like with sqlite3 connections, the context manager form does not open or close the connection itself.
*/
export class MessageRegistry {
    // Keep a local version of the database entries so we can easily check registered channels and lookup their names
    public dbRegisteredChannels: Map<string, typeof channelsDB.$inferSelect> = new Map
    constructor(private db: typeof database) {}

    async open() {
        const channels = await this.getChannels();
        channels.forEach(ch => this.dbRegisteredChannels.set(ch.channelId, ch))
    }

    async registerMessage(message: Message) {
        const [channelConfig] = await this.db.select().from(channelsDB).where(eq(channelsDB.channelId, message.channelId));
        if (!channelConfig) {
            await AuditLogs.logNewMessage(`Attempted to find config for channel ${message.channelId} but found nothing`)
            return;
        }

        const deleteAt = message.createdAt.getTime() + channelConfig.durationInMs
        await this.db.insert(messages).values({channelId: message.channelId, messageId: message.id, deleteAt: deleteAt})
        await AuditLogs.logNewMessage(`Registering a message (${message.id}) for ${channelConfig.channelName}, should be deleted at ${deleteAt}`)
        return deleteAt;
    }

    async registerChannel(channel: TextChannel, durationInMs: number, initialAutoDeleteMessageId: string, durationInEnglish: string, initialAutoDeleteMessageTimestamp: string) {
        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channel.id))
       
        const [insertedChannel] = await this.db.insert(channelsDB).values({
            durationInMs,
            durationInEnglish,
            initialAutoDeleteMessageTimestamp,
            channelId: channel.id,
            initialAutoDeleteMessageId,
            channelName: channel.name,
        }).onConflictDoUpdate({ target: channelsDB.channelId, set: {
            durationInMs: durationInMs, initialAutoDeleteMessageId, durationInEnglish
        }}).returning()

        this.dbRegisteredChannels.set(channel.id, insertedChannel!)

        console.log('successfully registered a channel ', channel.name)
        await AuditLogs.logNewMessage('successfully registered a channel ' + channel.name)
    }

    async getChannels() {
        return this.db.select().from(channelsDB)
    }

    async getChannel(channelId: string) {
        return (await this.db.select().from(channelsDB).where(eq(channelsDB.channelId, channelId)))[0]
    }
    async getExpiredMessages() {
        const nowTimestamp = new Date().getTime();
        await this.db.update(messages).set({markForDeletion: true}).where(lte(messages.deleteAt, nowTimestamp));

        const expiredMessages = await this.db.select().from(messages).where(eq(messages.markForDeletion, true))
        if (expiredMessages.length > 0) {
            await AuditLogs.logNewMessage('Marked the following messages for deletion: ' + expiredMessages.map(m => m.messageId).join(', '))
        }
    

        return expiredMessages;
    }

    async clearMessagesMarkedForDeletion() {
        await this.db.delete(messages).where(eq(messages.markForDeletion, true))
        await AuditLogs.logNewMessage('Cleared messages marked for deletion ')
    }

   
    async deregisterChannel(channelId: string) {
        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channelId))
        this.dbRegisteredChannels.delete(channelId)
        await AuditLogs.logNewMessage('successfully deregistered a channel ' + channelId)
    }

}

export class AutoDeleteChannel {
    
    constructor(public channelId: string, public durationInMs: number,public initialAutoDeleteMessageId: string) {}
}