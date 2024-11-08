- scanAllChannels to check for any messages that were added while the bot was down
- subscribe to a new message event and store every message that's received in the database by its id, along with a deleteAt that is the created time + duration
 - Every 1 second check what should be deleted and delete it
 - don't allow durations greater than 2 weeks


Improvements:
- Sleep until the next message deletion time