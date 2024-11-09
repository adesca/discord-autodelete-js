export interface ChannelResponseInterface {
    id: string,
    type: 0,
    last_message_id: string,
    flags: 0,
    guild_id: string,
    name: string,
    parent_id: string | null,
    rate_limit_per_user: 0,
    topic: string | null,
    position: number,
    permission_overwrites: [],
    nsfw: boolean
}

export interface MessageResponseInterface {
    type: 20,
    content: string,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    timestamp: string,
    edited_timestamp: string | null,
    flags: 0,
    components: [],
    id: string,
    channel_id: string,
    author: {
        id: string,
        username: string,
        avatar: string,
        discriminator: '5013',
        public_flags: 0,
        flags: 0,
        bot: true,
        banner: null,
        accent_color: null,
        global_name: null,
        avatar_decoration_data: null,
        banner_color: null,
        clan: null
    },
    pinned: false,
    mention_everyone: false,
    tts: false,
    application_id: string,
    // interaction: {
    //     id: '1304178099663142932',
    //     type: 2,
    //     name: 'enable',
    //     user: [Object]
    // },
    webhook_id: string,
    position: 0,
    // interaction_metadata: {
    //     id: '1304178099663142932',
    //     type: 2,
    //     user: [Object],
    //     authorizing_integration_owners: [Object],
    //     name: 'enable',
    //     command_type: 1
    // }

}