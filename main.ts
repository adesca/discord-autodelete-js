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
    },
    'syncDev': {
        alias: 'd',
        describe: 'Sync commands only with the given guild id',
        type: 'string'
    }
}).demandOption(['token', 'applicationId']).parseSync()

argv.applicationId

if (argv.sync) {    
    registerCommandsWithDiscord(argv.applicationId, argv.token)
} else if (argv.syncDev) {
    registerCommandsWithDiscord(argv.applicationId, argv.token, argv.syncDev)
}else {
    const messageRegistry = new MessageRegistry(database)
    // toplevel awaits aren't allowed
    messageRegistry.open().then(() => {
        new AutoDeleteBot(argv.token, argv.applicationId, messageRegistry).start();
    });
    
}

