import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const API_KEY = process.env.OPENAI_API_KEY;

export interface GeneratedProblem {
    id: string;
    title: string;
    subject: string;
    unit: string;
    text: string;
    questions: { id: string, label: string, correctAnswer: string }[];
}

export async function generateProblem(subject: string, unit: string | null): Promise<GeneratedProblem> {
    if (!API_KEY) {
        throw new Error("OPENAI_API_KEY is not set");
    }

    const openai = new OpenAI({
        apiKey: API_KEY,
    });

    const prompt = `
あなたは数学の問題作成者です。
以下の条件で、中学生〜高校生レベルの数学の問題を1問作成してください。

教科: ${subject}
${unit ? `単元: ${unit}` : ''}

出力は以下のJSON形式のみで返してください。
Markdownのコードブロックは使用しないでください。

{
  "title": "問題のタイトル（例: 二次関数の最大・最小）",
  "text": "問題文（例: 以下の二次関数の頂点を求めよ...）",
  "questions": [
    {
      "label": "設問ラベル (例: (1) 頂点の座標)",
      "correctAnswer": "正解 (例: (2, -4))"
    }
  ]
}

問題は、設問が1〜3問程度含まれるものが望ましいです。
`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful assistant that generates math problems in JSON format." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("No content from OpenAI");
        }

        const result = JSON.parse(content);

        return {
            id: uuidv4(),
            subject: subject,
            unit: unit || "General",
            title: result.title,
            text: result.text,
            questions: result.questions.map((q: any, index: number) => ({
                id: `q${index + 1}`,
                label: q.label,
                correctAnswer: q.correctAnswer
            }))
        };

    } catch (error) {
        console.error("Problem Generation Error:", error);
        throw error;
    }
}
