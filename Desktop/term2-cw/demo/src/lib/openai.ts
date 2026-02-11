import OpenAI from 'openai';

const API_KEY = process.env.OPENAI_API_KEY;

export interface GradingResult {
    score: number;
    feedback: string;
    isCorrect: boolean;
}

export async function gradeWithOpenAI(
    imageBase64: string | null,
    problemText: string,
    questions: { id: string, label: string, correctAnswer: string }[],
    userAnswers: Record<string, string>
): Promise<GradingResult> {

    // Fallback Mock Logic (used if no API Key)
    if (!API_KEY) {
        console.warn("OpenAI API Key missing. Running Mock Grading.");
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
記述内容や筆跡からの詳細な分析を行うには、OPENAI_API_KEYを設定してください。
（現状は回答の一致のみで判定しています）`
        };
    }

    const openai = new OpenAI({
        apiKey: API_KEY,
    });

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

    try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: "user",
                content: [
                    { type: "text", text: prompt },
                ],
            },
        ];

        if (imageBase64) {
            // Ensure base64 string includes the prefix or handle it correctly
            // OpenAI expects "data:image/jpeg;base64,{base64_image}"
            const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;
            (messages[0].content as any[]).push({
                type: "image_url",
                image_url: {
                    url: imageUrl,
                },
            });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Or gpt-4-turbo
            messages: messages,
            response_format: { type: "json_object" },
            max_tokens: 500,
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("No content from OpenAI");
        }

        const result = JSON.parse(content);
        return {
            score: result.score,
            feedback: result.feedback,
            isCorrect: result.isCorrect,
        };

    } catch (error: any) {
        console.error("OpenAI Grading Error:", error);
        return {
            score: 0,
            isCorrect: false,
            feedback: `【エラーが発生しました】
エラー詳細: ${error.message || JSON.stringify(error)}`
        };
    }
}
