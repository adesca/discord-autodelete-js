import { Client, Events, GatewayIntentBits, InteractionResponse, REST, Routes, TextChannel } from "discord.js";
import { AutoDeleteCommands } from "./commands";
import { AutoDeleteChannel, MessageRegistry } from "./MessageRegistry";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });


export class AutoDeleteBot {
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