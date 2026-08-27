import { demoEnabled } from "./DemoMode";
import { DEMO_WAYBILL, DEMO_MOVEMENT } from "./seed";

const node = (uri, x, y) => ({
    id: uri,
    type: "LO",
    dragHandle: "#node-header",
    data: { uri },
    position: { x, y },
});

const tab = (id, name, nodes) => ({
    id,
    name,
    nodes,
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
});

const initialTabs = () => demoEnabled()
    ? {
        tabs: [
            tab("demo-waybill", "Waybill 729-12345675", [node(DEMO_WAYBILL, 300, 200)]),
            tab("demo-flight", "Flight AV241", [node(DEMO_MOVEMENT, 300, 200)]),
        ],
        activeTabId: "demo-waybill",
    }
    : {
        tabs: [tab("canvas-1", "Canvas 1", [])],
        activeTabId: "canvas-1",
    };

export default initialTabs;
