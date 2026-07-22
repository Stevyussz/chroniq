import { AI_TIMEOUT_MS, withAiTimeout } from "./robust";

type GroqRole = "system" | "user" | "assistant";

export interface GroqMessage {
    role: GroqRole;
    content: string;
}

interface GroqChatOptions {
    messages: GroqMessage[];
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
}

interface GroqErrorPayload {
    error?: {
        message?: string;
        type?: string;
        code?: string;
    };
}

interface GroqChatResponse {
    choices?: Array<{
        message?: {
            content?: string;
        };
    }>;
}

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export function getChroniqAiModel() {
    return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
}

export async function generateChroniqAiText({
    messages,
    temperature = 0.3,
    maxTokens = 1200,
    jsonMode = false,
    timeoutMs = AI_TIMEOUT_MS,
}: GroqChatOptions) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

    const request = fetch(GROQ_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: getChroniqAiModel(),
            messages,
            temperature,
            max_tokens: maxTokens,
            ...(jsonMode && { response_format: { type: "json_object" } }),
        }),
    }).then(async (response) => {
        const payload = await response.json().catch(() => null) as (GroqChatResponse & GroqErrorPayload) | null;

        if (!response.ok) {
            const error = new Error(payload?.error?.message || `Chroniq AI request failed with status ${response.status}`);
            (error as Error & { status?: number; code?: string }).status = response.status;
            (error as Error & { status?: number; code?: string }).code = payload?.error?.code;
            throw error;
        }

        const content = payload?.choices?.[0]?.message?.content?.trim();
        if (!content) throw new Error("Chroniq AI returned an empty response");
        return content;
    });

    return withAiTimeout(request, "Chroniq AI Groq", timeoutMs);
}
