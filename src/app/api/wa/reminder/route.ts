import { NextRequest, NextResponse } from "next/server";

type BridgeAction = "status" | "sync" | "test" | "commands" | "share-plan";

const getBridgeConfig = () => {
    const url = process.env.CHRONIQ_WA_BRIDGE_URL?.replace(/\/$/, "");
    const key = process.env.CHRONIQ_WA_BRIDGE_API_KEY;
    return { url, key };
};

async function callBridge(path: string, init?: RequestInit) {
    const { url, key } = getBridgeConfig();

    if (!url || !key) {
        return NextResponse.json({
            ok: false,
            configured: false,
            error: "WhatsApp bridge belum dikonfigurasi di environment."
        }, { status: 503 });
    }

    const response = await fetch(`${url}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            "x-chroniq-bridge-key": key,
            ...(init?.headers || {}),
        },
        cache: "no-store",
    });

    const data = await response.json().catch(() => ({
        ok: false,
        error: "Bridge mengirim respons yang tidak bisa dibaca."
    }));

    return NextResponse.json(data, { status: response.status });
}

export async function GET() {
    return callBridge("/api/status");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const action = body?.action as BridgeAction;

        if (action === "status") {
            return callBridge("/api/status");
        }

        if (action === "test") {
            return callBridge("/api/messages/test", {
                method: "POST",
                body: JSON.stringify({ phone: body.phone }),
            });
        }

        if (action === "commands") {
            return callBridge("/api/commands");
        }

        if (action === "share-plan") {
            return callBridge("/api/messages/share-plan", {
                method: "POST",
                body: JSON.stringify({ userId: body.userId }),
            });
        }

        if (action === "sync") {
            return callBridge("/api/schedules/sync", {
                method: "POST",
                body: JSON.stringify(body.payload),
            });
        }

        return NextResponse.json({ ok: false, error: "Action WhatsApp reminder tidak dikenal." }, { status: 400 });
    } catch (error) {
        return NextResponse.json({
            ok: false,
            error: error instanceof Error ? error.message : "Gagal memproses request WhatsApp reminder."
        }, { status: 500 });
    }
}
