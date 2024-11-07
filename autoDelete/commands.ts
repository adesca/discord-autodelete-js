import { CacheType, ChatInputCommandInteraction, GuildTextChannelType, Interaction, SlashCommandBuilder, TextChannel } from "discord.js";
import parse from "parse-duration";

export const enableChannelCommand = {
    data: new SlashCommandBuilder().setName('enable').setDescription('Configure a channel to autodelete messages')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to autodelete in').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('How old messages should get to be').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        const channel: TextChannel | null = interaction.options.getChannel('channel');
        const duration = interaction.options.getString('duration');

        if (!channel || !duration) {
            console.error("Missing channel or duration")
            interaction.reply({ content: 'Missing channel or duration', ephemeral: true });
        
            return;
        }

        const timeInMs = parse(duration);
        if (!timeInMs) {
            await interaction.reply({ content: 'The duration could not be understood. Please use a recognized time format like 1hr 20min, or 1w. See here for further examples: https://www.npmjs.com/package/parse-duration', ephemeral: true });
            return;
        }

        if (timeInMs < 0) {
            await interaction.reply({ content: 'Invalid duration, duration must be positive', ephemeral: true });
            return;
        }

        // The response is sent first so that the response message is not subject to autodelete,
        // per calculation of `after`.
        const response = await interaction.reply(`Enabled autodelete in ${channel.name} with message duration ${duration}`)

        try {

        } catch (e) {
            await response.edit(`Failed to enable autodelete in ${channel.name}`)
            throw new Error("Failed to enable autodelete")
        }
    
    }
}

export const AutoDeleteCommands = {
    enable: enableChannelCommand
}