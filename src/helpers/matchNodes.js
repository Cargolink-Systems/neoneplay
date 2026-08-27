const matchNodes = (nodes, index, query) => {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return nodes
        .filter((node) => {
            const uri = String((node.data && node.data.uri) || node.id).toLowerCase();
            if (uri.includes(q)) return true;
            const entry = index[(node.data && node.data.uri) || node.id];
            return !!(entry && entry.text && entry.text.includes(q));
        })
        .map((node) => node.id);
};

export default matchNodes;
