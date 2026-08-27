import { demoEnabled } from "./DemoMode";
import { DEMO_WAYBILL, DEMO_MOVEMENT } from "./seed";

const node = (uri, x, y) => ({
    id: uri,
    type: "LO",
    dragHandle: "#node-header",
    data: { uri },
    position: { x, y },
});

const demoInitialNodes = () => demoEnabled()
    ? [node(DEMO_WAYBILL, 250, 150), node(DEMO_MOVEMENT, 700, 150)]
    : [];

export default demoInitialNodes;
