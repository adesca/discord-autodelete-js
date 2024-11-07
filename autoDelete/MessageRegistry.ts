import { TextChannel } from "discord.js";
import { database } from "../database";
import { channels as channelsDB } from "../db/schema";
import { eq } from "drizzle-orm/sqlite-core/expressions";

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

    async registerChannel(channel: AutoDeleteChannel) {
        await this.db.delete(channelsDB).where(eq(channelsDB.channelId, channel.channelId))
        // Could we just do an upsert and skip the delete step?
        // Original code says that this is to prevent race conditions
        await this.db.insert(channelsDB).values(channel).onConflictDoUpdate({ target: channelsDB.channelId, set: {
            durationInMs: channel.durationInMs, after: channel.durationInMs
        }})

        this.channels[channel.channelId] = channel;
        console.log('successfully registered a channel')
    }

}

export class AutoDeleteChannel {
    constructor(public channelId: string, public durationInMs: number,public after: string) {}
}