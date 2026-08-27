export const dynamic = "force-dynamic";

const REQUIRED = ["NEONE_PLAY_TOKEN_URL", "NEONE_PLAY_CLIENT_ID", "NEONE_PLAY_CLIENT_SECRET"];

export async function GET() {
    if (REQUIRED.some((name) => !process.env[name])) {
        return Response.json({ configured: false });
    }

    const res = await fetch(process.env.NEONE_PLAY_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: process.env.NEONE_PLAY_CLIENT_ID,
            client_secret: process.env.NEONE_PLAY_CLIENT_SECRET,
        }),
        cache: "no-store",
    });
    if (!res.ok) {
        return Response.json({ configured: true, error: "token request failed" }, { status: 502 });
    }

    const { access_token, expires_in } = await res.json();
    return Response.json({
        configured: true,
        access_token,
        expires_in,
        server: {
            org_name: process.env.NEONE_PLAY_SERVER_NAME || "NE:ONE",
            protocol: process.env.NEONE_PLAY_SERVER_PROTOCOL || "http",
            host: process.env.NEONE_PLAY_SERVER_HOST || "localhost:8080",
            color: process.env.NEONE_PLAY_SERVER_COLOR || "#8b5cf6",
        },
    });
}
