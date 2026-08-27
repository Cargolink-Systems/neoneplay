const requestError = require('./requestError').default
const { acceptError } = require('./requestError')

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

describe('acceptError', () => {
    it('returns null when the accept succeeded', () => {
        expect(acceptError({ ok: true, status: 204 })).toBeNull()
    })

    it('marks the change request as pending on failure', () => {
        const err = acceptError({ ok: false, status: 401 })
        expect(err).toMatch(/pending/)
        expect(err).toMatch(/do not resubmit/)
        expect(err).toMatch(/token/i)
    })
})
