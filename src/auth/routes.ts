import { Hono } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import {lucia} from "./lucia";
import { generateId } from 'lucia'
import { db } from '../db'
import {users, nativeAccounts, oauthAccounts, sessions} from "./schema";
import { eq } from "drizzle-orm";
import { discord } from "./oauth";

const auth = new Hono()

auth.get('/me', async (c) => {
    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (!sessionId) {
        return c.json(null)
    }

    const { session, user } = await lucia.validateSession(sessionId)

    if (!session) {
        return c.json(user)
    }

    // Get OAuth account for username
    const [oauth] = await db.select().from(oauthAccounts).where(eq(oauthAccounts.userId, user.id))

    if (oauth) {
        return c.json({
            id: user.id,
            email: user.email,
            username: oauth?.providerUsername ?? null,
            provider: oauth?.provider ?? null
        })
    }

    // Get native account for username
    const [native] = await db
        .select()
        .from(nativeAccounts)
        .where(eq(nativeAccounts.userId, user.id))

    return c.json({
        id: user.id,
        username: native?.username ?? native?.email,
        provider: 'native'
    })
})

auth.post('/register', async (c) => {
    const { email, password, username } = await c.req.json()

    // Hash the password
    const passwordHash = await Bun.password.hash(password)

    // Create user
    const userId = generateId(15)
    const now = new Date()

    await db.insert(users).values({
        id: userId,
        email: email,
        createdAt: now,
        updatedAt: now,
    })

    await db.insert(nativeAccounts).values({
        id: generateId(15),
        userId: userId,
        email: email,
        username: username,
        passwordHash: passwordHash,
        createdAt: now,
    })

    // Create session
    const session = await lucia.createSession(userId, {})
    const cookie = lucia.createSessionCookie(session.id)
    setCookie(c, cookie.name, cookie.value, cookie.attributes)

    return c.json({ success: true })
})

auth.post('/login', async (c) => {
    const { email, password } = await c.req.json()

    // Find the account
    const [account] = await db.select().from(nativeAccounts).where(eq(nativeAccounts.email, email))

    if (!account) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Verify password
    const valid = await Bun.password.verify(password, account.passwordHash)

    if (!valid) {
        return c.json({ error: 'Invalid credentials' }, 401)
    }

    // Create session
    const session = await lucia.createSession(account.userId, {})
    const cookie = lucia.createSessionCookie(session.id)
    setCookie(c, cookie.name, cookie.value, cookie.attributes)

    return c.json({ success: true })
})

auth.post('/logout', async (c) => {
    const sessionId = getCookie(c, lucia.sessionCookieName)

    if (sessionId) {
        await lucia.invalidateSession(sessionId)
    }

    const cookie = lucia.createBlankSessionCookie()
    setCookie(c, cookie.name, cookie.value, cookie.attributes)

    return c.json({ success: true })
})

auth.get('/discord', async (c) => {
    const state = generateId(15)
    const url = discord.createAuthorizationURL(state, null, ['identify', 'email'])

    setCookie(c, 'oauth_state', state, {
        httpOnly: true,
        maxAge: 60 * 10,
        path: '/',
    })

    return c.redirect(url.toString())
})

auth.get('/discord/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = getCookie(c, 'oauth_state')

    // Verify state matches
    if (!code || state !== storedState) {
        return c.json({ error: 'Invalid state' }, 400)
    }

    // Exchange code for tokens
    const tokens = await discord.validateAuthorizationCode(code, null)

    // Get Discord user info
    const discordUser = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokens.accessToken()}` }
    }).then(r => r.json())

    // Check if this Discord account is already linked
    const [existingOAuth] = await db
        .select()
        .from(oauthAccounts)
        .where(eq(oauthAccounts.providerUserId, discordUser.id))

    let userId: string

    if (existingOAuth) {
        // Existing user, just log them in
        userId = existingOAuth.userId
    } else {
        // New user, create account
        userId = generateId(15)
        const now = new Date()

        await db.insert(users).values({
            id: userId,
            email: discordUser.email,
            createdAt: now,
            updatedAt: now,
        })

        await db.insert(oauthAccounts).values({
            id: generateId(15),
            userId: userId,
            provider: 'discord',
            providerUserId: discordUser.id,
            providerUsername: discordUser.username,
            createdAt: now,
        })
    }

    // Create session
    const session = await lucia.createSession(userId, {})
    const cookie = lucia.createSessionCookie(session.id)
    setCookie(c, cookie.name, cookie.value, cookie.attributes)

    return c.redirect('/')
})

auth.delete('/account', async (c) => {
    const sessionId = getCookie(c, lucia.sessionCookieName)
    if (!sessionId) return c.json({ error: 'Not logged in' }, 401)

    const { session, user } = await lucia.validateSession(sessionId)
    if (!session) return c.json({ error: 'Not logged in' }, 401)

    // Delete auth data
    await db.delete(oauthAccounts).where(eq(oauthAccounts.userId, user.id))
    await db.delete(nativeAccounts).where(eq(nativeAccounts.userId, user.id))
    await db.delete(sessions).where(eq(sessions.userId, user.id))
    await db.delete(users).where(eq(users.id, user.id))

    // Clear cookie
    const cookie = lucia.createBlankSessionCookie()
    setCookie(c, cookie.name, cookie.value, cookie.attributes)

    return c.json({ success: true })
})

export default auth