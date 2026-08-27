const requestError = require('./requestError').default

describe('requestError', () => {
    it('returns null for successful responses', () => {
        expect(requestError({ ok: true, status: 200 })).toBeNull()
        expect(requestError({ ok: true, status: 201 })).toBeNull()
    })

    it('returns a token hint for 401', () => {
        expect(requestError({ ok: false, status: 401 })).toMatch(/token/i)
    })

    it('returns a generic message with the status otherwise', () => {
        expect(requestError({ ok: false, status: 500 })).toBe('Request failed (500)')
    })
})
