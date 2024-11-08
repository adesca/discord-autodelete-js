# discord-autodelete-js

_Heavily_ inspired by https://github.com/Eta0/DiscordAutoDelete
This is basically a reimplementation of the python library, but using discordjs primitives and simplifying it by not allowing messages to stay around for longer than 14 days (the bulk delete limit).

To use this your bot will need the permissions View Channels, Manage Messages, and Read Message History.
These options appear when you select bot as the scope in the Oauth2 url generator when creating your discord bot.