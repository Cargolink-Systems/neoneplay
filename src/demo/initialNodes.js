import { demoEnabled } from "./DemoMode";
import { DEMO_WAYBILL } from "./seed";

const demoInitialNodes = () => demoEnabled()
    ? [{
        id: DEMO_WAYBILL,
        type: "LO",
        dragHandle: "#node-header",
        data: { uri: DEMO_WAYBILL },
        position: { x: 250, y: 150 },
    }]
    : [];

export default demoInitialNodes;
