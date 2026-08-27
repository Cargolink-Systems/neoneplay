const matchNodes = require('./matchNodes').default

const node = (uri) => ({ id: uri, data: { uri } })

describe('matchNodes', () => {
    it('returns an empty array for an empty or whitespace-only query', () => {
        expect(matchNodes([node('https://api.example.com/lo/1')], {}, '')).toEqual([])
        expect(matchNodes([node('https://api.example.com/lo/1')], {}, '   ')).toEqual([])
    })

    it('matches on the node uri when there is no index entry', () => {
        const nodes = [node('https://api.example.com/logistics-objects/waybill-729'), node('https://api.example.com/logistics-objects/piece-1')]
        expect(matchNodes(nodes, {}, 'waybill-729')).toEqual(['https://api.example.com/logistics-objects/waybill-729'])
    })

    it('matches on indexed text when the uri does not contain the term', () => {
        const uri = 'https://api.example.com/logistics-objects/piece-1'
        const nodes = [node(uri)]
        const index = { [uri]: { type: 'Piece', text: 'auto parts - gearboxes' } }
        expect(matchNodes(nodes, index, 'gearboxes')).toEqual([uri])
    })

    it('is case-insensitive', () => {
        const uri = 'https://api.example.com/logistics-objects/piece-1'
        const nodes = [node(uri)]
        const index = { [uri]: { type: 'Piece', text: 'auto parts - gearboxes' } }
        expect(matchNodes(nodes, index, 'GEARBOXES')).toEqual([uri])
    })

    it('returns no matches when nothing matches', () => {
        const nodes = [node('https://api.example.com/logistics-objects/piece-1')]
        expect(matchNodes(nodes, {}, 'nonexistent-term')).toEqual([])
    })

    it('matches multiple nodes', () => {
        const a = 'https://api.example.com/logistics-objects/piece-1'
        const b = 'https://api.example.com/logistics-objects/piece-2'
        const c = 'https://api.example.com/logistics-objects/waybill-1'
        const nodes = [node(a), node(b), node(c)]
        const index = {
            [a]: { type: 'Piece', text: 'gearboxes' },
            [b]: { type: 'Piece', text: 'brake kits' },
        }
        expect(matchNodes(nodes, index, 'piece')).toEqual([a, b])
    })
})
