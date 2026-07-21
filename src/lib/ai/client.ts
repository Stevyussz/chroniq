export async function fetchChroniqAiJson<T>(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = 16_000
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(input, {
            ...init,
            signal: controller.signal,
        });

        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            const message = payload && typeof payload === "object" && "error" in payload
                ? String((payload as { error?: unknown }).error)
                : "Chroniq AI belum bisa memproses permintaan ini.";
            throw new Error(message);
        }

        return payload as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error("Chroniq AI butuh terlalu lama merespons. Coba lagi sebentar.");
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}
