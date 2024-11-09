import { database } from "../database";
import { auditEvents } from "../db/schema";

export class AuditLogs {

    static async logNewMessage(event: string) {
        await database.insert(auditEvents).values({
            event: event,
            timestamp: new Date().toISOString(),
            timestampMs: new Date().getTime()
        })
    }
}