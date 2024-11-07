import yargs from "yargs";
import { AutoDeleteBot, registerCommandsWithDiscord } from "./autoDelete/autoDeleteBot";
import { MessageRegistry } from "./autoDelete/MessageRegistry";
import { database } from "./database";

const argv = yargs(process.argv.slice(2)).options({
    'applicationId': {
        alias: 'a',
        describe: 'Application ID',
        type: 'string'
    },
    'token': {
        alias: 't',
        describe: 'Application Token',
        type: 'string'
    },
    'sync': {
        alias: 's',
        describe: 'Sync commands with discord',
        type: 'boolean'
    }
}).demandOption(['token', 'applicationId']).parseSync()

argv.applicationId

if (argv.sync) {    
    registerCommandsWithDiscord(argv.applicationId, argv.token)
} else {
    const messageRegistry = new MessageRegistry(database)
    // toplevel awaits aren't allowed
    messageRegistry.open().then(() => {
        new AutoDeleteBot(argv.token, argv.applicationId, messageRegistry).start();
    });
    
}

