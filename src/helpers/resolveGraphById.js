function resolveGraphById(jsonLd, id) {
    if (!jsonLd["@graph"]) {
        return jsonLd;
    }

    const mainElement = jsonLd["@graph"].find(element => element["@id"] === id);
    if (!mainElement) {
        return null;
    }

    function replaceLinksWithNodes(obj) {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object' && obj[key]["@id"]) {
                const linkedNode = jsonLd["@graph"].find(element => element["@id"] === obj[key]["@id"]);
                if (linkedNode) {
                    obj[key] = { ...linkedNode };
                }
                replaceLinksWithNodes(obj[key])
            }
            if (obj[key] && Array.isArray(obj[key])) {
                obj[key].forEach(arrayObj => {
                    const linkedNode = jsonLd["@graph"].find(element => element["@id"] === arrayObj["@id"]);
                    if (linkedNode) {
                        for (const field in linkedNode) {
                            arrayObj[field] = linkedNode[field];
                        }
                    }
                    replaceLinksWithNodes(arrayObj)
                })
            }
        }
    }

    replaceLinksWithNodes(mainElement);
    return mainElement;
}

export default resolveGraphById;
