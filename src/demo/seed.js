export const DEMO_HOST = "demo.onerecord.example";
export const DEMO_BASE = `https://${DEMO_HOST}`;

const lo = (slug) => `${DEMO_BASE}/logistics-objects/${slug}`;
const CARGO = "https://onerecord.iata.org/ns/cargo#";
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString().replace(/\.\d{3}Z$/, "Z");
const codeList = (list, code) => ({ "@id": `https://onerecord.iata.org/ns/coreCodeLists#${list}_${code}` });
const kg = (slug, value) => ({
    "@id": `demo:${slug}`,
    "@type": "Value",
    "numericalValue": { "@value": String(value) },
    "unit": codeList("MeasurementUnitCode", "KGM"),
});
const event = (name, code, date, forUri) => ({
    "@type": "LogisticsEvent",
    "eventName": name,
    "eventCode": { "code": code },
    "eventDate": { "@value": date },
    "eventTimeType": { "@id": "https://onerecord.iata.org/ns/cargo#ACTUAL" },
    "eventFor": { "@id": forUri },
    "recordingOrganization": { "@id": lo("org-acme-gha") },
});

const piece = (slug, description, weightValue) => ({
    "@id": lo(slug),
    "@type": CARGO + "Piece",
    "goodsDescription": description,
    "grossWeight": kg(`gw-${slug}`, weightValue),
    "ofShipment": { "@id": lo("shipment-1c77") },
});

const objects = [
    { "@id": lo("org-acme-gha"), "@type": CARGO + "Company", "name": "ACME Ground Handling" },
    { "@id": lo("org-acme-parts"), "@type": CARGO + "Company", "name": "ACME Auto Parts Corp" },
    { "@id": lo("org-andinos"), "@type": CARGO + "Company", "name": "Repuestos Andinos SA" },
    { "@id": lo("org-avianca"), "@type": CARGO + "Carrier", "name": "Avianca Cargo" },
    { "@id": lo("loc-mia"), "@type": CARGO + "Location", "locationName": "Miami International Airport" },
    { "@id": lo("loc-bog"), "@type": CARGO + "Location", "locationName": "El Dorado International Airport" },
    piece("piece-1", "auto parts - gearboxes", 103.1),
    piece("piece-2", "auto parts - brake kits", 98.4),
    piece("piece-3", "auto parts - filters", 105.7),
    piece("piece-4", "auto parts - sensors", 105.3),
    {
        "@id": lo("shipment-1c77"),
        "@type": CARGO + "Shipment",
        "goodsDescription": "auto parts",
        "totalGrossWeight": kg("gw-total", 412.5),
        "pieces": [1, 2, 3, 4].map((n) => ({ "@id": lo(`piece-${n}`) })),
        "waybill": { "@id": lo("waybill-729-12345675") },
    },
    {
        "@id": lo("waybill-729-12345675"),
        "@type": CARGO + "Waybill",
        "waybillPrefix": "729",
        "waybillNumber": "12345675",
        "shipment": { "@id": lo("shipment-1c77") },
        "involvedParties": [
            {
                "@id": "demo:party-shp",
                "@type": "Party",
                "partyRole": codeList("ParticipantIdentifier", "SHP"),
                "partyDetails": { "@id": lo("org-acme-parts") },
            },
            {
                "@id": "demo:party-cne",
                "@type": "Party",
                "partyRole": codeList("ParticipantIdentifier", "CNE"),
                "partyDetails": { "@id": lo("org-andinos") },
            },
        ],
    },
    { "@id": lo("uld-ake12345"), "@type": CARGO + "ULD", "uldSerialNumber": "12345" },
    { "@id": lo("means-n1234av"), "@type": CARGO + "TransportMeans", "vehicleRegistration": "N1234AV" },
    {
        "@id": lo("movement-av241"),
        "@type": CARGO + "TransportMovement",
        "transportIdentifier": "AV241",
        "departureLocation": { "@id": lo("loc-mia") },
        "arrivalLocation": { "@id": lo("loc-bog") },
        "departureDate": { "@value": minutesAgo(240) },
        "operatingTransportMeans": { "@id": lo("means-n1234av") },
        "loadingActions": {
            "@id": "demo:loading-av241",
            "@type": "Loading",
            "loadedUnits": [{ "@id": lo("uld-ake12345") }],
            "loadedPieces": [1, 2, 3, 4].map((n) => ({ "@id": lo(`piece-${n}`) })),
        },
    },
];

const events = {
    [lo("piece-1")]: [event("Received from flight", "RCF", minutesAgo(518), lo("piece-1"))],
    [lo("piece-2")]: [event("Received from flight", "RCF", minutesAgo(517), lo("piece-2"))],
    [lo("piece-3")]: [event("Received from flight", "RCF", minutesAgo(516), lo("piece-3"))],
    [lo("piece-4")]: [event("Received from flight", "RCF", minutesAgo(515), lo("piece-4"))],
    [lo("movement-av241")]: [event("Departed", "DEP", minutesAgo(233), lo("movement-av241"))],
};

export const DEMO_WAYBILL = lo("waybill-729-12345675");
export const DEMO_MOVEMENT = lo("movement-av241");

export const seedBlob = () => ({
    objects: Object.fromEntries(JSON.parse(JSON.stringify(objects)).map((body) => [
        body["@id"],
        { body, revision: 1, lastModified: minutesAgo(233) },
    ])),
    events: JSON.parse(JSON.stringify(events)),
    changeRequests: {},
    counter: 1,
});
