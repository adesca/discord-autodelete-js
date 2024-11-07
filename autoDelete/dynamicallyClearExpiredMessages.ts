import { messages } from "../db/schema";

export function dynamicallyClearExpiredMessages(expiredMessagesbyChannel: Record<string, Array<typeof messages.$inferSelect>>) {
    let skippedCount = 0;
    let deletionReason = 'Time-based autodelete'
    const deletions = []

    Object.entries(expiredMessagesbyChannel).forEach(([channelId, messages]) => {
        // todo: add protect pins

        const timeLimit = new Date().getTime() - (13.8 * 24 * 60 * 60 * 1000)  //14 days plus margin of error
        const bulkDeletable = messages.filter(m => m.deleteAt > timeLimit)
        const nonBulkDeletable = messages.filter(m => m.deleteAt < timeLimit)

        if (bulkDeletable.length ===  1) {
            // deletions.append(bulkDeletable[0].dele)
        }
    })

}