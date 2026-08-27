'use client'

import { useEffect } from "react";
import useInternalStore from "@/store";
import { createDemoServer } from "./server";
import { browserStorage } from "./storage";
import { DEMO_HOST } from "./seed";

export const demoEnabled = () => process.env.NEXT_PUBLIC_DEMO_MODE === "1";

const DemoMode = () => {
    const upsertServer = useInternalStore((state) => state.upsertServer);

    useEffect(() => {
        if (!demoEnabled() || window.demoServer) return;

        const server = createDemoServer(browserStorage("neoneplay-demo-v1"));
        window.demoServer = server;

        const original = window.fetch.bind(window);
        window.fetch = (input, init) => {
            const url = typeof input === "string" ? input : input.url;
            if (!url.includes(DEMO_HOST)) return original(input, init);
            const method = (init && init.method) || "GET";
            const body = init && init.body ? JSON.parse(init.body) : null;
            const res = server.handle(method, url, body);
            return Promise.resolve(new Response(
                res.body === null ? null : JSON.stringify(res.body),
                { status: res.status, headers: res.headers },
            ));
        };

        upsertServer({
            org_name: "Demo — in-browser",
            host: DEMO_HOST,
            protocol: "https",
            token: "demo",
            color: "#f59e0b",
        });
    }, [upsertServer]);

    return null;
};

export default DemoMode;
