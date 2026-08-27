'use client'

import { useEffect } from "react";
import useInternalStore from "@/store";

const RETRY_MS = 60 * 1000;

const AutoConfig = () => {
    const upsertServer = useInternalStore((state) => state.upsertServer);

    useEffect(() => {
        let timer;
        let cancelled = false;

        const refresh = async () => {
            try {
                const res = await fetch("/api/token");
                const data = await res.json();
                if (cancelled || !data.configured) return;
                if (!data.access_token) throw new Error(data.error);
                upsertServer({ ...data.server, token: data.access_token });
                timer = setTimeout(refresh, data.expires_in * 800);
            } catch {
                if (!cancelled) timer = setTimeout(refresh, RETRY_MS);
            }
        };

        refresh();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [upsertServer]);

    return null;
};

export default AutoConfig;
