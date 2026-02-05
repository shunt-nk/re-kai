import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyATtr1wnL9furJ0y1qUmKiN7rEcrwrh_94";

export interface GradingResult {
    score: number;
    feedback: string;
    isCorrect: boolean;
}

export async function gradeWithGemini(
    imageBase64: string | null,
    problemText: string,
    questions: { id: string, label: string, correctAnswer: string }[],
    userAnswers: Record<string, string>
): Promise<GradingResult> {

    // Fallback Mock Logic (used if no API Key or on error)
    const runMockGrading = () => {
        console.log("Running Mock Grading (Gemini Key missing or Error)");
        let correctCount = 0;
        questions.forEach(q => {
            if ((userAnswers[q.id] || '').trim() === q.correctAnswer) {
                correctCount++;
            }
        });
        const score = Math.floor((correctCount / questions.length) * 10);
        return {
            score,
            isCorrect: correctCount === questions.length,
            feedback: `【AI分析結果（デモモード）】
正解数は ${correctCount}/${questions.length} です。
記述内容や筆跡からの詳細な分析を行うには、GEMINI_API_KEYを設定してください。
（現状は回答の一致のみで判定しています）`
        };
    };

    if (!API_KEY) {
        return runMockGrading();
    }

    const maxRetries = 5;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
        try {
            const genAI = new GoogleGenerativeAI(API_KEY);
            // Use gemini-2.0-flash-exp or similar if needed, but sticking to what's 'found' (even if limited)
            // If 2.0-flash is too limited, we might want to try a very standard one if available.
            // But 404s suggested otherwise. Sticking to 2.0-flash with retries.
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `
あなたは数学の先生です。以下の生徒の解答画像を採点してください。
問題: ${problemText}

設問と正解:
${questions.map((q, i) => `(${i + 1}) ${q.label} -> 正解: ${q.correctAnswer}`).join('\n')}

生徒のテキスト入力回答:
${JSON.stringify(userAnswers)}

画像には、生徒の途中式や筆跡が含まれています。
1. 画像内の手書き文字を認識し、式が論理的に合っているか確認してください。
2. 途中式が丁寧か、間違えやすいポイントがないか分析してください。
3. 最終的な点数（10点満点）と、120文字以内のフィードバックを出力してください。

出力は以下のJSON形式のみで返してください:
{
  "score": number,
  "feedback": "string",
  "isCorrect": boolean
}
`;

            const imagePart = imageBase64 ? {
                inlineData: {
                    data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
                    mimeType: "image/png",
                },
            } : null;

            const parts = imagePart ? [prompt, imagePart] : [prompt];

            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();

            // Extract JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("Invalid JSON from Gemini");
            }

        } catch (error: any) {
            // Check for 429 or 503 (Service Unavailable)
            const isRateLimit = error.message?.includes('429') || error.status === 429;
            const isOverloaded = error.message?.includes('503') || error.status === 503;

            if ((isRateLimit || isOverloaded) && retryCount < maxRetries) {
                const waitTime = 10000 * (retryCount + 1); // 10s, 20s, 30s, 40s, 50s
                console.log(`Gemini Rate Limit/Error (Attempt ${retryCount + 1}/${maxRetries + 1}). Retrying in ${waitTime / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                retryCount++;
                continue;
            }

            console.error("Gemini Grading Error:", error);
            return {
                score: 0,
                isCorrect: false,
                feedback: `【エラーが発生しました】
エラー詳細: ${error.message || JSON.stringify(error)}
(GEMINI_API_KEY: ${API_KEY ? '設定済み' : '未設定'})`
            };
        }
    }

    return { score: 0, isCorrect: false, feedback: "エラー: リトライ回数を超えました。" };
}
