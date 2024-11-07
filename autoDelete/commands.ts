import { CacheType, ChatInputCommandInteraction, Interaction, SlashCommandBuilder } from "discord.js";

export const enableChannelCommand = {
    data: new SlashCommandBuilder().setName('enable').setDescription('Configure a channel to autodelete messages'),
    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply(`${interaction.user.username} has enabled autodelete`)
    }
}

export const AutoDeleteCommands = {
    enable: enableChannelCommand
}