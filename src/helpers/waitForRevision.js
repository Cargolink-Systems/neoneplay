const waitForRevision = async (uri, token, above, tries = 15, delayMs = 500) => {
    for (let i = 0; i < tries; i++) {
        try {
            const res = await fetch(uri, {
                method: "HEAD",
                cache: "no-store",
                headers: {
                    "cache-control": "no-cache",
                    "Authorization": "Bearer " + token
                }
            });
            if (res.ok) {
                const revision = parseInt(res.headers.get("latest-revision"));
                if (isNaN(revision)) return null;
                if (revision > above) return revision;
            }
        } catch { }
        if (i < tries - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return null;
};

export default waitForRevision;
