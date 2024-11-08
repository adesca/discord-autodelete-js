import { Client, DiscordAPIError, Events, GatewayIntentBits, GuildMessageManager, InteractionResponse, Message, MessageManager, PartialChannelData, Partials, PartialTextBasedChannelFields, REST, Routes, TextChannel } from "discord.js";
import { AutoDeleteCommands } from "./commands";
import { AutoDeleteChannel, MessageRegistry } from "./MessageRegistry";
import { scheduler } from 'node:timers/promises';
import { convertSnowflakeIdToTimestamp } from "../util";
import { ChannelResponseInterface, MessageResponseInterface } from "./models";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });


export class AutoDeleteBot {
    activeSleep: boolean;
    rest: REST;


    constructor(private apiToken: string, private applicationId: string, private messageRegistry: MessageRegistry) {
        this.rest = new REST().setToken(apiToken);
        client.once(Events.ClientReady, readyClient => {
            console.log(`ready! logged in as ${readyClient.user.tag}`)
        })

        client.on(Events.MessageCreate, async message => {
            await this.messageRegistry.registerMessage(message)
        })

        client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = AutoDeleteCommands[interaction.commandName]
            if (!command) {
                console.error("No matching command with name ", interaction.commandName)
            }

            try {
                await command.execute(interaction, this)
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        })

    }

    start() {
        client.login(this.apiToken);
        this.beginMonitor();
    }

    async beginMonitor() {
        console.log('monitoring...')
        // check for any messages that may have been missed while the bot was down
        await this.scanAllChannels();
        do {
            await scheduler.wait(1000)
            await this.deleteExpiredMessages();
        } while(true)
    }

    async deleteExpiredMessages() {
        const expiredMessages = await this.messageRegistry.getExpiredMessages();
      
        const expiredMessagesByChannelId: Record<string, typeof expiredMessages> = {}
        expiredMessages.forEach(message => {
            const currChannelMsgs = expiredMessagesByChannelId[message.channelId] || []
            expiredMessagesByChannelId[message.channelId] = [...currChannelMsgs, message]
        })

        Object.entries(expiredMessagesByChannelId).forEach(async ([channelId, expiredMessages]) => {
            let channel = await client.channels.fetch(channelId)

            if (!channel) {
                // prime the cache
                await this.rest.get(Routes.channel(channelId)) as ChannelResponseInterface
                channel = await client.channels.fetch(channelId) as TextChannel;
            }

            await (channel as TextChannel).bulkDelete(expiredMessages.map(message => message.messageId))
            await this.messageRegistry.clearMessagesMarkedForDeletion()
            console.log('deletion complete')
        })

    }

    async scanAllChannels(fromBeginning = false) {
        const channels: TextChannel[] = []
  
        Object.keys(this.messageRegistry.channels).forEach(async channelId => {
            try {
                // For some reason we need to fetch it and then it'll be fully in the cache?
                const partialChannel = await this.rest.get(Routes.channel(channelId)) as ChannelResponseInterface
                const channel = await client.channels.fetch(channelId);

                if (channel) {
                    channels.push(channel as TextChannel);
                }
            
    
                await Promise.all(channels.map(ch => this.scanChannel(ch, fromBeginning)))
            } catch(e) {
                const error = e as DiscordAPIError;
                console.error("Failed to retrieve channel ", channelId,  error.message )
                console.log("Deregistering channel ", channelId, " because it's disappeared ")
                // this.messageRegistry.deregisterChannel(channelId)

            }
        })


    }

    async scanChannel(channel: TextChannel, fromBeginning: boolean) {
        console.log('Scanning channel ', channel.id)
        const channelConfig = this.messageRegistry.channels[channel.id]

        if (!channelConfig) {
            throw new Error("Can't scan unregistered channel")
        }

        let after = channelConfig.initialAutoDeleteMessageId;

        if(!fromBeginning) {
            if (channel.lastMessage && channel.lastMessage.createdTimestamp > convertSnowflakeIdToTimestamp(after)) {
                after = channel.lastMessage.id
            }
        }

        const afterTimestamp = convertSnowflakeIdToTimestamp(after);

        let foundCount = 0;
        console.log('starting') 
        // not using the client to fetch the messages because it seems to be really slow compared to a direct rest call
        // especially for the minimal amount of info i need
        const channelMessages = await this.rest.get(Routes.channelMessages(channel.id)) as MessageResponseInterface[];
        const messagesToDelete = channelMessages
        .filter(message => new Date(message.timestamp).getTime() > afterTimestamp)
        .map(message => {
            foundCount += 1;
            return message.id;
        })
        console.log('messaged fetched and processed')

        console.log('would delete ', foundCount, ' messages')
        channel.bulkDelete(messagesToDelete)
        // const awaitMessages  = await channel.awaitMessages();
        // console.log('await', awaitMessages);
        // console.log('found')
        // const blah2 = await channel.messages.fetch();
        // console.log('blah2', blah2)

    }

    async registerChannel(channel: TextChannel, durationInMs: number, confirmationMessage: InteractionResponse<boolean>, durationInEnglish: string) {
        this.messageRegistry.registerChannel(channel, durationInMs, confirmationMessage.id, durationInEnglish)
    }

    async deregisterChannel(channel: TextChannel) {
        this.messageRegistry.deregisterChannel(channel.id)
    }

    async getChannels(): Promise<Array<[channelName: string, duration: string]>> {
        const channels = await this.messageRegistry.getChannels()
        return channels.map(channel => [channel.channelName, channel.durationInEnglish])
    }

}

export async function registerCommandsWithDiscord(applicationId: string, apiToken: string) {
    const rest = new REST().setToken(apiToken);
    const commands = Object.values(AutoDeleteCommands)
        .map(commandEntry => commandEntry.data.toJSON());


    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(applicationId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
}