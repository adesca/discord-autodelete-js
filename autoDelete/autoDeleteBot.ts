import { Client, Events, GatewayIntentBits, InteractionResponse, Partials, REST, Routes, TextChannel } from "discord.js";
import { AutoDeleteCommands } from "./commands";
import { AutoDeleteChannel, MessageRegistry } from "./MessageRegistry";
import { scheduler } from 'node:timers/promises';

const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Message] });


export class AutoDeleteBot {
    private wakeTime: number = 0;
    activeSleep: boolean;


    constructor(private apiToken: string, private applicationId: string, private messageRegistry: MessageRegistry) {
        client.once(Events.ClientReady, readyClient => {
            console.log(`ready! logged in as ${readyClient.user.tag}`)
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
    }

    async registerChannel(channel: TextChannel, durationInMs: number, confirmationMessage: InteractionResponse<boolean>) {
        this.messageRegistry.registerChannel(new AutoDeleteChannel(channel.id, durationInMs, confirmationMessage.id))
    }

    /* 
    - clear expired messages
    - check to see if there's any upcoming messages to expire
    - if there are, wait for their expiration time, else wait 1 second to see if any messages popup that need to be cleared
    */
    async monitorExpiredMessages() {
        console.log("Starting monitor")
        do {
            await this.clearExpiredMessages();
            console.log('Finished clearing messages, beginning wait')
            await this.waitUntilNeeded();
            console.log('Finished waiting, beginning clearing messages.')
        } while (true)
    }

    // homegrown lock, maybe replace with a yield/scheduler based implementation later?
    // initial library I tried didn't have good types
    lock_clearExpiredMessages = false;
    async clearExpiredMessages() {
        // if the lock is in use, skip
        if (this.lock_clearExpiredMessages) {
            return;
        } 

        this.lock_clearExpiredMessages = true;

        /* 
        Assume by default that pending work will be finished by the end of this action.
                # If this assumption is true, this will find no more messages on its next check, and pause
                # until more messages become available. If it is false, then it won't need to check this anyway.
        */
       const expiredMessages = await this.messageRegistry.popExpiredMessages();
       // we're about to get really fucking fancy
       const expiredMessagesbyChannel = {}
       expiredMessages.forEach(message => {
        const currentExpiredMessagesForChannel = expiredMessagesbyChannel[message.channelId] || []
        currentExpiredMessagesForChannel.push(message);
        expiredMessagesbyChannel[message.channelId] = currentExpiredMessagesForChannel
       })

       // dynamic deletion strategy based on bulk message delete limitations



       this.lock_clearExpiredMessages = false;
    }

    async waitUntilNeeded() {
        const [_, deleteTimestamp] = await this.messageRegistry.getNextExpiringMessage();
        if (deleteTimestamp === null) {
            console.log('no upcoming expiring message, so waiting a second before checking to clear expired messages')
            await scheduler.wait(1000);
        } else {
            this.wakeTime = deleteTimestamp;
            await this.sleepUntil();
        }
    }

    /* 
    Sleeps until this.wakeTime.
        This sleep may be modified by changing this.wakeTime and then cancelling this.activeSleep.
        It is not safe to run this method multiple times concurrently.
    */
    async sleepUntil() {
        do {
            // this is called after waitUntilNeeded, so there should always be a waittime
            const remainingMilliseconds = this.wakeTime - new Date().getTime();
            if (remainingMilliseconds > 0) {
                // todo: implement abortsignal support?
                this.activeSleep = true;
                await scheduler.wait(remainingMilliseconds)
                this.activeSleep = false;
            } else {
                // wait a second before checking wakeTime
                await scheduler.wait(1000);
            }
        } while (true)
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