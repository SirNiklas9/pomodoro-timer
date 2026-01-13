import { Lucia } from 'lucia'
import { DrizzleSQLiteAdapter} from "@lucia-auth/adapter-drizzle";
import {sessions, users} from "./schema";
import {db} from "../db";

const adapter = new DrizzleSQLiteAdapter(db, sessions, users)

export const lucia = new Lucia(adapter, {
    sessionCookie: {
        attributes: {
            secure: process.env.NODE_ENV === 'production'
        }
    },
    getUserAttributes: (attributes) => {
        return {
            email: attributes.email
        }
    }
})

declare module 'lucia' {
    interface Register {
        Lucia: typeof lucia
        DatabaseUserAttributes: {
            email: string | null
        }
    }
}