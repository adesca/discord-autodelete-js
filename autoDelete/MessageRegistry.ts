import { Message, TextChannel } from "discord.js";
import { database } from "../database";
import { channels as channelsDB, messages } from "../db/schema";
import { eq, lte } from "drizzle-orm/sqlite-core/expressions";
import {asc, desc} from 'drizzle-orm'
import { convertSnowflakeIdToTimestamp } from "../util";

/* 
    Manages database entries for autodelete channels and messages pending deletion.
    This class must be constructed using its `open` factory method,
    and may be used as a context manager to commit or rollback database edits on exit.
    Note that, like with sqlite3 connections, the context manager form does not open or close the connection itself.
*/
export class MessageRegistry {
    channels: Record<string, AutoDeleteChannel> = {}
    constructor(private db: typeof database) {}

    async open() {
        // refresh internal channel list with database values
        const dbChannels = await this.db.select().from(channelsDB);
        dbChannels.forEach(dbch => this.channels[dbch.channelId] = dbch)
    }

    async registerMessage(message: Message) {
        const channelConfig = this.channels[message.channelId];

        if (!channelConfig) return;

        const deleteAt = message.createdAt.getTime() + channelConfig.durationInMs
        await this.db.insert(messages).values({channelId: message.channelId, messageId: message.id, deleteAt: deleteAt})
        return deleteAt;
        
    }

    async registerChannel(channel: TextChannel, durationInMs: number, initialAutoDeleteMessageId: string, durationInEnglish: string) {
        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channel.id))
       
        await this.db.insert(channelsDB).values({
            durationInMs, durationInEnglish,
            channelId: channel.id,
            initialAutoDeleteMessageId,
            channelName: channel.name
        }).onConflictDoUpdate({ target: channelsDB.channelId, set: {
            durationInMs: durationInMs, initialAutoDeleteMessageId
        }})

         // If there's a conflict, we update with the new values
        // this.channels[channel.channelId] = channel;
        console.log('successfully registered a channel ', channel.name)
    }

    async getNextExpiringMessage(): Promise<[something: unknown, deleteTime: number | null]> {
        const [nextExpiringMessage] =  await this.db.select().from(messages).orderBy(asc(messages.deleteAt)).limit(1)
        if (nextExpiringMessage) {
            return [0,nextExpiringMessage.deleteAt];
        } else {
            return [0,null]
        }
    }

    // async getLatestMessage(channelId: string) {
    //     // can I get this off of the channel object?
    //     const [latestMessage] = await this.db.select().from(messages).where(eq(channelsDB.channelId, channelId)).orderBy(desc(messages.messageId)).limit(1);
    //     if (latestMessage) {
    //         return {
    //             ...latestMessage,
    //             createdAt: convertSnowflakeIdToTimestamp(latestMessage.messageId)
    //         };
    //     } else return null;
        
    // }

    async getExpiredMessages() {
        const nowTimestamp = new Date().getTime();
        await this.db.update(messages).set({markForDeletion: true}).where(lte(messages.deleteAt, nowTimestamp));

        return  await this.db.select().from(messages).where(eq(messages.markForDeletion, true))
    }

    async clearMessagesMarkedForDeletion() {
        await this.db.delete(messages).where(eq(messages.markForDeletion, true))
    }

    async popExpiredMessages() {
        const nowTimestamp = new Date().getTime();
        // may not be needed? 
        
    
        return await this.db.delete(messages).where(lte(messages.deleteAt, nowTimestamp)).returning()
    }

    convertRowToPartialMessage() {

    }

    async deregisterChannel(channelId: string) {

        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channelId))
       
    }

}

export class AutoDeleteChannel {
    
    constructor(public channelId: string, public durationInMs: number,public initialAutoDeleteMessageId: string) {}
}