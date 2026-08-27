const { GET } = require('./route')

const ENV = {
    NEONE_PLAY_TOKEN_URL: 'http://keycloak/token',
    NEONE_PLAY_CLIENT_ID: 'client',
    NEONE_PLAY_CLIENT_SECRET: 'secret',
}

describe('GET /api/token', () => {
    afterEach(() => {
        for (const name of Object.keys(ENV)) delete process.env[name]
        delete global.fetch
    })

    it('reports unconfigured when env vars are missing', async () => {
        const body = await (await GET()).json()
        expect(body).toEqual({ configured: false })
    })

    it('returns the token and server config', async () => {
        Object.assign(process.env, ENV)
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ access_token: 'abc', expires_in: 300 }),
        })
        const body = await (await GET()).json()
        expect(body.access_token).toBe('abc')
        expect(body.expires_in).toBe(300)
        expect(body.server.host).toBe('localhost:8080')
        const [url, init] = global.fetch.mock.calls[0]
        expect(url).toBe(ENV.NEONE_PLAY_TOKEN_URL)
        expect(init.body.get('grant_type')).toBe('client_credentials')
    })

    it('returns 502 when the token request fails', async () => {
        Object.assign(process.env, ENV)
        global.fetch = jest.fn().mockResolvedValue({ ok: false })
        const res = await GET()
        expect(res.status).toBe(502)
    })
})
