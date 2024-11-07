import yargs from "yargs";
import { AutoDeleteBot } from "./autoDelete/autoDeleteBot";

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

console.log('sync ', argv.sync)
if (argv.sync) {
    new AutoDeleteBot(argv.token, argv.applicationId).registerCommandsWithDiscord();
} else {
    console.log('did not sync')
}

