import {  ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from "discord.js";
import parse from "parse-duration";
import { AutoDeleteBot } from "./autoDeleteBot";

export const enableChannelCommand = {
    data: new SlashCommandBuilder().setName('enable').setDescription('Configure a channel to autodelete messages')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to autodelete in').setRequired(true))
        .addStringOption(option => option.setName('duration').setDescription('How long messages should stay in the server (no longer than 12 days)').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction, bot: AutoDeleteBot) {
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

        if (timeInMs > 12 * 24 * 60 * 60 * 1000) {
            await interaction.reply({ content: 'Invalid duration, duration cannot be longer than 12 days', ephemeral: true });
            return;
        }

        // The response is sent first so that the response message is not subject to autodelete,
        // per calculation of `after`.
        const response = await interaction.reply(`Enabled autodelete in ${channel.name} with message duration ${duration}`)

        try {
            bot.registerChannel(channel, timeInMs, response, duration)
        } catch (e) {
            await response.edit(`Failed to enable autodelete in ${channel.name}`)
            throw new Error("Failed to enable autodelete")
        }

    }
}

export const disableChannelCommand = {
    data: new SlashCommandBuilder().setName('disable').setDescription('Turn off message autodeletion for a channel')
        .addChannelOption(option => option.setName('channel').setDescription('Channel to disable autodelete in').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction, bot: AutoDeleteBot) {
        const channel: TextChannel | null = interaction.options.getChannel('channel');
        if (!channel) return;

        const response = await interaction.reply(`Disabled autodelete in ${channel.name}`)

        try {
            await bot.deregisterChannel(channel)
        } catch (e) {
            await response.edit(`Failed to disable autodelete in ${channel.name}`)
            throw new Error("Failed to disable autodelete")
        }

    }
}

export const listChannelCommand = {
    data: new SlashCommandBuilder().setName('list').setDescription('List all channels with autodelete enabled and their durations'),
    async execute(interaction: ChatInputCommandInteraction, bot: AutoDeleteBot) {

        const response = await interaction.reply(`Working on it...`)

        try {
            const channels: Array<[channelName: string, duration: string]> = await bot.getChannels()
            let accString = "";
            channels.forEach(([name, durationInEnglish]) => {
                accString += `#${name} duration: ${durationInEnglish}\n`
            })
            await response.edit(`${accString}`)
        } catch (e) {
            await response.edit(`Failed to list the channels :(`)
            throw new Error("Failed to list channels")
        }
    }
}

export const AutoDeleteCommands = {
    enable: enableChannelCommand,
    disable: disableChannelCommand,
    list: listChannelCommand
}