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
        const channelConfig = this.channels[+message.channelId];

        if (!channelConfig) return;

        const deleteAt = message.createdAt.getTime() + channelConfig.durationInMs
        await this.db.insert(messages).values({channelId: message.channelId, messageId: message.id, deleteAt: deleteAt})
        return deleteAt;
        
    }

    async registerChannel(channel: AutoDeleteChannel) {
        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channel.channelId))
        // Could we just do an upsert and skip the delete step?
        // Original code says that this is to prevent race conditions
        await this.db.insert(channelsDB).values(channel).onConflictDoUpdate({ target: channelsDB.channelId, set: {
            durationInMs: channel.durationInMs, initialAutoDeleteMessageId: channel.initialAutoDeleteMessageId
        }})

        this.channels[channel.channelId] = channel;
        console.log('successfully registered a channel ', channel, this.channels)
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

    async popExpiredMessages() {
        const nowTimestamp = new Date().getTime();
        // may not be needed? 
        const expiredMessages = await this.db.select().from(messages)
        .innerJoin(channelsDB, eq(channelsDB.channelId, messages.channelId))
        .where(lte(messages.deleteAt, nowTimestamp))
        
        // expiredMessages.map(m => )


        return await this.db.delete(messages).where(lte(messages.deleteAt, nowTimestamp)).returning()
    }

    convertRowToPartialMessage() {

    }

    async deregisterChannel(channelId: string) {
        // todo: handle deleted channels
        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channelId))
        this.channels[channelId] = undefined;
    }

}

export class AutoDeleteChannel {
    
    constructor(public channelId: string, public durationInMs: number,public initialAutoDeleteMessageId: string) {}
}