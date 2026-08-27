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
            const revision = parseInt(res.headers.get("latest-revision"));
            if (revision > above) return revision;
        } catch { }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return above;
};

export default waitForRevision;
