import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize the Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { taskName, targetDuration } = await req.json();

        if (!taskName || !targetDuration) {
            return NextResponse.json({ error: 'Missing task parameters.' }, { status: 400 });
        }

        // We use gemini-2.5-flash as it's the fastest and widely available in free tier
        // configuring it to strictly return JSON matching our schema.
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: {
                                type: SchemaType.STRING,
                                description: "Nama sub-tugas yang logis dan spesifik dalam bahasa Indonesia"
                            },
                            duration: {
                                type: SchemaType.INTEGER,
                                description: "Estimasi durasi waktu yang realistis dalam spesifik menit (misal: 15, 30, 45, 60)"
                            }
                        },
                        required: ["name", "duration"]
                    }
                }
            }
        });

        const prompt = `
Anda adalah Chroniq AI, sebuah mesin pengoptimasi produktivitas yang dirancang untuk mencegah burnout.
Tugas utama Anda adalah memecah tugas besar (Cognitive Overload) menjadi langkah-langkah mikro (sub-tugas) yang jauh lebih mudah dieksekusi oleh manusia.

Tugas Asli: "${taskName}"
Total Durasi Target: ${targetDuration} menit.

Hasilkan rincian sub-tugas yang total durasinya pas mendekati ${targetDuration} menit.
Pecah menjadi etape yang masuk akal, durasi tiap etape maksimal 60 menit.
Berikan respons HANYA dalam format JSON Array sesuai skema. Jangan kembalikan teks apapun selain JSON.
`;

        const result = await model.generateContent(prompt);
        const textResponse = result.response.text();

        try {
            const parsedArray = JSON.parse(textResponse);
            return NextResponse.json({ subtasks: parsedArray });
        } catch {
            return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error('AI Split Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
