const codeListCode = require('./codeListCode').default

describe('codeListCode', () => {
    it('extracts the code from the coreCodeLists form', () => {
        expect(codeListCode('https://onerecord.iata.org/ns/coreCodeLists#MeasurementUnitCode_KGM')).toBe('KGM')
    })

    it('extracts the code from the code-lists form', () => {
        expect(codeListCode('https://onerecord.iata.org/ns/code-lists/StatusCode#RCF')).toBe('RCF')
    })

    it('falls back to the fragment for coreCodeLists without underscore', () => {
        expect(codeListCode('https://onerecord.iata.org/ns/coreCodeLists#RCF')).toBe('RCF')
    })

    it('returns null for a code-lists IRI without fragment', () => {
        expect(codeListCode('https://onerecord.iata.org/ns/code-lists/StatusCode')).toBeNull()
    })

    it('returns null for other IRIs and non-strings', () => {
        expect(codeListCode('https://onerecord.iata.org/ns/cargo#Piece')).toBeNull()
        expect(codeListCode(null)).toBeNull()
        expect(codeListCode({ '@id': 'x' })).toBeNull()
    })
})
