import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'

const sqlite = new Database('bananadoro.db')
export const db = drizzle(sqlite)