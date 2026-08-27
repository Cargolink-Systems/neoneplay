import { seedBlob, DEMO_BASE } from "./seed";
import codeListCode from "../helpers/codeListCode";

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

const sameValue = (stored, sent) => {
    if (plainValue(stored) == sent) return true;
    const iri = stored && typeof stored === "object" ? stored["@id"] : null;
    const code = codeListCode(iri);
    return code !== null && code === sent;
};

const restoreShape = (oldIri, value) => {
    if (!oldIri || typeof value !== "string") return value;
    const oldCode = codeListCode(oldIri);
    if (oldCode !== null) return { "@id": oldIri.slice(0, oldIri.length - oldCode.length) + value };
    return { "@id": value };
};

const applyOperation = (target, op, removed) => {
    const key = op["api:p"].split("#").pop();
    const value = op["api:o"][0]["api:hasValue"];
    const kind = op["api:op"]["@id"].split(/[#:]/).pop();
    if (kind === "DELETE") {
        const current = target[key];
        const items = current === undefined ? [] : [].concat(current);
        const gone = items.find((item) => sameValue(item, value));
        if (gone !== undefined) {
            if (gone && typeof gone === "object" && gone["@id"]) removed[key] = gone["@id"];
            const kept = items.filter((item) => item !== gone);
            if (!kept.length) delete target[key];
            else target[key] = Array.isArray(current) ? kept : kept[0];
        }
    }
    if (kind === "ADD") {
        const next = restoreShape(removed[key], value);
        const current = target[key];
        if (current === undefined) target[key] = next;
        else if (Array.isArray(current)) current.push(next);
        else target[key] = [current, next];
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

    const atKey = (iso) => iso.split(".")[0].replaceAll("-", "").replaceAll(":", "") + "Z";

    const getObject = (uri, query) => {
        const entry = blob.objects[uri];
        if (!entry) return { status: 404, headers: {}, body: {} };
        const at = new URLSearchParams(query || "").get("at");
        if (at) {
            const request = (blob.changeRequests[uri] || [])
                .find((cr) => atKey(cr["isRequestedAt"]["@value"]) === at);
            const revision = request && request["hasChange"]["hasRevision"]["@value"];
            const snapshot = revision && blob.history && blob.history[uri] && blob.history[uri][revision];
            if (snapshot) {
                return json(200, snapshot.body, {
                    "revision": String(revision),
                    "latest-revision": String(entry.revision),
                    "last-modified": new Date(snapshot.lastModified).toUTCString(),
                });
            }
        }
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
        ((blob.history ??= {})[uri] ??= {})[entry.revision] = {
            body: JSON.parse(JSON.stringify(entry.body)),
            lastModified: entry.lastModified,
        };
        const ops = [].concat(raw["api:hasOperation"] || []);
        const removed = {};
        for (const op of ops) {
            const target = findSubject(entry.body, op["api:s"]);
            if (!target) continue;
            applyOperation(target, op, removed);
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
        return method === "PATCH" ? applyChange(clean, body) : getObject(clean, query);
    };

    const reset = () => {
        blob = seedBlob();
        storage.save(blob);
    };

    return { handle, reset };
};
