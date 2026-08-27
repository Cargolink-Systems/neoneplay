const searchText = require('./searchText').default

describe('searchText', () => {
    it('flattens nested string values and joins them', () => {
        const text = searchText({ "@id": "x", name: "ACME Corp", nested: { label: "gearboxes" } })
        expect(text).toContain('acme corp')
        expect(text).toContain('gearboxes')
    })

    it('flattens arrays of objects', () => {
        const text = searchText({ pieces: [{ goodsDescription: "brake kits" }, { goodsDescription: "filters" }] })
        expect(text).toContain('brake kits')
        expect(text).toContain('filters')
    })

    it('reduces @type IRIs to their short class name', () => {
        const text = searchText({ "@type": "https://onerecord.iata.org/ns/cargo#Waybill" })
        expect(text).toContain('waybill')
        expect(text).not.toContain('https://onerecord.iata.org/ns/cargo#waybill')
    })

    it('reads @value from typed literals', () => {
        const text = searchText({ eventDate: { "@value": "2026-08-27T00:00:00Z" } })
        expect(text).toContain('2026-08-27t00:00:00z')
    })

    it('ignores @context and @id', () => {
        const text = searchText({ "@context": "https://onerecord.iata.org/ns/cargo", "@id": "https://api.example.com/logistics-objects/abc" })
        expect(text).toBe('')
    })

    it('is case-insensitive by construction', () => {
        const text = searchText({ name: "MiXeD CaSe" })
        expect(text).toBe(text.toLowerCase())
    })

    it('caps the output length', () => {
        const text = searchText({ name: 'a'.repeat(5000) })
        expect(text.length).toBeLessThanOrEqual(2000)
    })
})
