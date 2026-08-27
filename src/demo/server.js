import { seedBlob, DEMO_BASE } from "./seed";

const API = "https://onerecord.iata.org/ns/api";
const CARGO = "https://onerecord.iata.org/ns/cargo#";

const stripPrefix = (key) => key.startsWith("cargo:") ? key.slice(6) : key;

const normalize = (value) => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
        const out = {};
        for (const key of Object.keys(value)) {
            if (key === "@context") continue;
            out[stripPrefix(key)] = normalize(value[key]);
        }
        if (typeof out["@type"] === "string") out["@type"] = stripPrefix(out["@type"]);
        if (typeof out["@id"] === "string" && out["@id"].startsWith("cargo:")) {
            out["@id"] = CARGO + out["@id"].slice(6);
        }
        return out;
    }
    return value;
};

const plainValue = (value) =>
    value && typeof value === "object" ? value["@value"] ?? value["@id"] : value;

const findSubject = (body, subject) => {
    if (body["@id"] === subject) return body;
    for (const key of Object.keys(body)) {
        const value = body[key];
        const items = Array.isArray(value) ? value : [value];
        for (const item of items) {
            if (item && typeof item === "object") {
                const found = findSubject(item, subject);
                if (found) return found;
            }
        }
    }
    return null;
};

const applyOperation = (target, op) => {
    const key = op["api:p"].split("#").pop();
    const value = op["api:o"][0]["api:hasValue"];
    const kind = op["api:op"]["@id"].split(/[#:]/).pop();
    if (kind === "DELETE") {
        const current = target[key];
        if (Array.isArray(current)) {
            target[key] = current.filter((item) => plainValue(item) != value);
            if (!target[key].length) delete target[key];
        } else if (current !== undefined && plainValue(current) == value) {
            delete target[key];
        }
    }
    if (kind === "ADD") {
        const current = target[key];
        if (current === undefined) target[key] = value;
        else if (Array.isArray(current)) current.push(value);
        else target[key] = [current, value];
    }
};

export const createDemoServer = (storage) => {
    let blob = storage.load();
    if (!blob || !blob.objects) {
        blob = seedBlob();
        storage.save(blob);
    }
    const persist = () => storage.save(blob);
    const nextId = () => ++blob.counter;

    const json = (status, body, headers = {}) => ({
        status,
        headers: { "content-type": "application/ld+json", ...headers },
        body,
    });

    const getObject = (uri) => {
        const entry = blob.objects[uri];
        if (!entry) return { status: 404, headers: {}, body: {} };
        return json(200, entry.body, {
            "revision": String(entry.revision),
            "latest-revision": String(entry.revision),
            "last-modified": new Date(entry.lastModified).toUTCString(),
        });
    };

    const listEvents = (uri) => json(200, {
        "@id": `${uri}/logistics-events`,
        "@type": "Collection",
        [`${API}#hasItem`]: blob.events[uri] || [],
    });

    const addEvent = (uri, raw) => {
        const event = normalize(raw);
        if (event.linkedObject) {
            event.eventFor = event.linkedObject;
            delete event.linkedObject;
        }
        if (event.eventCode && event.eventCode.code === undefined) {
            event.eventCode = { code: plainValue(event.eventCode) };
        }
        event["@id"] = `${uri}/logistics-events/${nextId()}`;
        (blob.events[uri] ??= []).push(event);
        persist();
        return json(201, {}, { "location": event["@id"] });
    };

    const applyChange = (uri, raw) => {
        const entry = blob.objects[uri];
        if (!entry) return { status: 404, headers: {}, body: {} };
        const ops = [].concat(raw["api:hasOperation"] || []);
        for (const op of ops) {
            const target = findSubject(entry.body, op["api:s"]) || entry.body;
            applyOperation(target, op);
        }
        const requestUri = `${DEMO_BASE}/action-requests/${nextId()}`;
        (blob.changeRequests[uri] ??= []).push({
            "@id": requestUri,
            "@type": ["ActionRequest", "ChangeRequest"],
            "hasRequestStatus": { "@id": `${API}#REQUEST_ACCEPTED` },
            "isRequestedAt": { "@value": new Date().toISOString() },
            "hasChange": { "hasRevision": { "@value": String(entry.revision) } },
        });
        entry.revision += 1;
        entry.lastModified = new Date().toISOString();
        persist();
        return json(201, {}, { "location": requestUri });
    };

    const auditTrail = (uri) => {
        const entry = blob.objects[uri];
        if (!entry) return { status: 404, headers: {}, body: {} };
        return json(200, {
            "@id": `${uri}/audit-trail`,
            "@type": "AuditTrail",
            "hasLatestRevision": { "@value": String(entry.revision) },
            "hasChangeRequest": blob.changeRequests[uri] || [],
        });
    };

    const createObject = (raw) => {
        const body = normalize(raw);
        body["@id"] = `${DEMO_BASE}/logistics-objects/created-${nextId()}`;
        blob.objects[body["@id"]] = {
            body,
            revision: 1,
            lastModified: new Date().toISOString(),
        };
        persist();
        return json(201, {}, { "location": body["@id"] });
    };

    const listAll = (query) => {
        const params = new URLSearchParams(query);
        const limit = Number(params.get("limit")) || 20;
        const offset = Number(params.get("offset")) || 0;
        const type = params.get("t") ? params.get("t").split("#").pop() : null;
        const matches = Object.values(blob.objects)
            .map((entry) => entry.body)
            .filter((body) => !type || [].concat(body["@type"]).includes(type))
            .slice(offset, offset + limit);
        if (!matches.length) return json(200, {});
        if (matches.length === 1) return json(200, matches[0]);
        return json(200, { "@graph": matches });
    };

    const handle = (method, url, body) => {
        const [clean, query] = url.replace("http://", "https://").split("?");
        if (clean === `${DEMO_BASE}/logistics-objects/internal/_all`) {
            return listAll(query || "");
        }
        if (clean.startsWith(`${DEMO_BASE}/action-requests/`)) {
            return { status: 204, headers: {}, body: null };
        }
        if (clean === `${DEMO_BASE}/logistics-objects` || clean === `${DEMO_BASE}/logistics-objects/`) {
            return createObject(body);
        }
        if (clean.endsWith("/logistics-events")) {
            const uri = clean.slice(0, -"/logistics-events".length);
            return method === "POST" ? addEvent(uri, body) : listEvents(uri);
        }
        if (clean.endsWith("/audit-trail")) {
            return auditTrail(clean.slice(0, -"/audit-trail".length));
        }
        return method === "PATCH" ? applyChange(clean, body) : getObject(clean);
    };

    return { handle };
};
