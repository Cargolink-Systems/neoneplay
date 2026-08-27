const CORE = 'https://onerecord.iata.org/ns/coreCodeLists#'
const LISTS = 'https://onerecord.iata.org/ns/code-lists/'

const codeListCode = (iri) => {
    if (typeof iri !== 'string') return null
    if (iri.startsWith(CORE)) {
        const sep = iri.includes('_') ? '_' : '#'
        return iri.substring(iri.indexOf(sep) + 1)
    }
    if (iri.startsWith(LISTS) && iri.includes('#')) {
        return iri.substring(iri.indexOf('#') + 1)
    }
    return null
}

export default codeListCode
