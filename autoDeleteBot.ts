import { Client, Events, GatewayIntentBits } from "discord.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });


export class AutoDeleteBot {
    constructor(private apiToken: string) {
        client.once(Events.ClientReady, readyClient => {
            console.log(`ready! logged in as ${readyClient.user.tag}`)
        })

        
    }

    start() {
        client.login(this.apiToken);
    }
}