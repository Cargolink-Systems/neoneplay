const listObjects = require('./listObjects').default

const CARGO = 'https://onerecord.iata.org/ns/cargo#'
const args = { protocol: 'http', host: 'a:8080', token: 't', typeIri: CARGO + 'Piece' }

const respond = (body, status = 200) =>
    jest.fn().mockResolvedValue({ ok: status < 300, status, json: () => Promise.resolve(body) })

describe('listObjects', () => {
    afterEach(() => delete global.fetch)

    it('requests the _all endpoint with encoded type, pagination and token', async () => {
        global.fetch = respond({})
        await listObjects({ ...args, limit: 5, offset: 10 })
        const [url, init] = global.fetch.mock.calls[0]
        expect(url).toBe('http://a:8080/logistics-objects/internal/_all?limit=5&offset=10&t=https%3A%2F%2Fonerecord.iata.org%2Fns%2Fcargo%23Piece')
        expect(init.headers.Authorization).toBe('Bearer t')
    })

    it('maps a @graph response to items with the most specific type', async () => {
        global.fetch = respond({
            '@graph': [
                { '@id': 'http://a/logistics-objects/1', '@type': [CARGO + 'LogisticsObject', CARGO + 'PhysicalLogisticsObject', CARGO + 'Piece'] },
                { '@id': 'http://a/logistics-objects/2', '@type': [CARGO + 'LogisticsObject', CARGO + 'Waybill'] },
            ],
        })
        const res = await listObjects(args)
        expect(res.ok).toBe(true)
        expect(res.items).toEqual([
            { id: 'http://a/logistics-objects/1', type: 'Piece' },
            { id: 'http://a/logistics-objects/2', type: 'Waybill' },
        ])
    })

    it('handles a single-object response without @graph', async () => {
        global.fetch = respond({ '@id': 'http://a/logistics-objects/1', '@type': CARGO + 'Waybill' })
        const res = await listObjects(args)
        expect(res.items).toEqual([{ id: 'http://a/logistics-objects/1', type: 'Waybill' }])
    })

    it('returns no items for an empty response', async () => {
        global.fetch = respond({})
        const res = await listObjects(args)
        expect(res).toEqual({ ok: true, status: 200, items: [] })
    })

    it('reports non-2xx statuses', async () => {
        global.fetch = respond({}, 401)
        const res = await listObjects(args)
        expect(res).toEqual({ ok: false, status: 401, items: [] })
    })

    it('reports network failures as status 0', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('down'))
        const res = await listObjects(args)
        expect(res).toEqual({ ok: false, status: 0, items: [] })
    })

    it('drops @graph entries without an @id', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ '@graph': [
                { '@id': 'https://x/logistics-objects/a', '@type': 'Piece' },
                { '@type': 'Piece' },
            ] }),
        })
        const res = await listObjects({ protocol: 'https', host: 'x', token: 't', typeIri: 'cargo#Piece' })
        expect(res.items).toHaveLength(1)
        expect(res.items[0].id).toBe('https://x/logistics-objects/a')
    })
})
