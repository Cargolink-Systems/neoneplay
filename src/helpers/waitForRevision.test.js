const waitForRevision = require('./waitForRevision').default

const headRes = (revision) => ({ headers: { get: () => String(revision) } })

describe('waitForRevision', () => {
    afterEach(() => delete global.fetch)

    it('polls until the revision exceeds the given one', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce(headRes(2))
            .mockResolvedValueOnce(headRes(2))
            .mockResolvedValueOnce(headRes(3))
        const revision = await waitForRevision('http://a/lo/1', 't', 2, 5, 0)
        expect(revision).toBe(3)
        expect(global.fetch).toHaveBeenCalledTimes(3)
        const [url, init] = global.fetch.mock.calls[0]
        expect(url).toBe('http://a/lo/1')
        expect(init.method).toBe('HEAD')
        expect(init.headers.Authorization).toBe('Bearer t')
    })

    it('returns null after the configured tries', async () => {
        global.fetch = jest.fn().mockResolvedValue(headRes(2))
        const revision = await waitForRevision('http://a/lo/1', 't', 2, 3, 0)
        expect(revision).toBeNull()
        expect(global.fetch).toHaveBeenCalledTimes(3)
    })

    it('returns null immediately when the header is missing', async () => {
        global.fetch = jest.fn().mockResolvedValue({ headers: { get: () => null } })
        const revision = await waitForRevision('http://a/lo/1', 't', 2, 5, 0)
        expect(revision).toBeNull()
        expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('keeps polling through fetch failures', async () => {
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error('down'))
            .mockResolvedValueOnce(headRes(3))
        const revision = await waitForRevision('http://a/lo/1', 't', 2, 5, 0)
        expect(revision).toBe(3)
    })
})
