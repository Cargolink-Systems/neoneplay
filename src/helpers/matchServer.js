const matchServer = (servers, uri) => {
    const host = uri.split("//").at(-1).split("/logistics-objects").at(0)
    return servers.find((server) => !host.indexOf(server.host)) || null
}

export default matchServer;
