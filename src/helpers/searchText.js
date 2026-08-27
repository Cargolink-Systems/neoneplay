const MAX_LENGTH = 2000;

const shortName = (iri) => String(iri).split("#").pop().split("/").pop();

const collect = (value, into) => {
    if (value == null) return;
    if (Array.isArray(value)) {
        value.forEach((item) => collect(item, into));
        return;
    }
    if (typeof value === "string") {
        into.push(value);
        return;
    }
    if (typeof value === "object") {
        Object.entries(value).forEach(([key, val]) => {
            if (key === "@context") return;
            if (key === "@type") {
                into.push(...[].concat(val).map(shortName));
                return;
            }
            if (key === "@value" && typeof val === "string") {
                into.push(val);
                return;
            }
            if (key === "@id") return;
            collect(val, into);
        });
    }
};

const searchText = (body) => {
    const parts = [];
    collect(body, parts);
    return parts.join(" ").toLowerCase().slice(0, MAX_LENGTH);
};

export default searchText;
