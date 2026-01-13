import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core'
import {users} from "../auth/schema";

export const userSettings = sqliteTable('user_settings', {
    userId: text('user_id').primaryKey().references(() => users.id),
    workDuration: integer('work_duration').default(25),
    breakDuration: integer('break_duration').default(5),
    soundEnabled: integer('sound_enabled', { mode: 'boolean' }).default(true),
    notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).default(true),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const userSessions = sqliteTable('user_sessions', {
    userId: text('user_id').primaryKey().references(() => users.id),
    sessionCode: text('session_code').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})