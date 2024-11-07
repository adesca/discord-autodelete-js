import yargs from "yargs";
import { AutoDeleteBot } from "./autoDeleteBot";

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
    }
}).demandOption(['token']).parseSync()

argv.applicationId

new AutoDeleteBot(argv.token).start();