const ABSTRACT_TYPES = ["LogisticsObject", "PhysicalLogisticsObject", "LoadingUnit", "LogisticsAgent", "LogisticsActivity", "LogisticsService"];

const toItem = (entry) => {
    const types = [].concat(entry["@type"] || []).map((iri) => iri.split("#").pop());
    const type = types.find((name) => !ABSTRACT_TYPES.includes(name)) || types[0] || "";
    return { id: entry["@id"], type: type };
};

const listObjects = async ({ protocol, host, token, typeIri, limit = 10, offset = 0 }) => {
    const url = protocol + "://" + host + "/logistics-objects/internal/_all"
        + "?limit=" + limit + "&offset=" + offset + "&t=" + encodeURIComponent(typeIri);
    try {
        const res = await fetch(url, {
            cache: "no-store",
            headers: {
                "Accept": "application/ld+json",
                "Authorization": "Bearer " + token
            }
        });
        if (!res.ok) return { ok: false, status: res.status, items: [] };
        const body = await res.json();
        const entries = body["@graph"] ? body["@graph"] : (body["@id"] ? [body] : []);
        const items = entries.filter((entry) => entry && entry["@id"]).map(toItem);
        return { ok: true, status: res.status, items: items };
    } catch {
        return { ok: false, status: 0, items: [] };
    }
};

export default listObjects;
