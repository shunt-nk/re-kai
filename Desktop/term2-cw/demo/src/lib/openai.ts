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

    if (!API_KEY) {
        throw new Error("OpenAI API Key is not configured.");
    }

    const openai = new OpenAI({
        apiKey: API_KEY,
    });

    // ユーザーの回答状況を整形
    const answerContext = questions.map((q, i) => {
        const studentAns = userAnswers[q.id] || "未回答";
        return `設問${i + 1} [${q.label}]:
  - 正解: ${q.correctAnswer}
  - 生徒の回答: ${studentAns}`;
    }).join('\n');

    // プロンプトを強化
    const systemPrompt = `あなたは優秀で親しみやすい数学の先生です。
生徒が解いた問題の「テキスト入力された答え」と「途中式が書かれたノートの画像」をもとに採点を行います。

## 採点ルール
1. **正誤判定の優先順位**:
   - 生徒の回答(テキスト)が正解と一致しているかを最優先で確認してください。
   - テキスト回答が正解と一致していれば、計算ミスはありません。
   - テキスト回答が間違っている、または未回答の場合、画像を解析して「考え方が合っているか」を確認し、部分点を与えてください。

2. **画像の解析**:
   - 画像内の手書き文字を読み取り、論理展開（途中式）が正しいか確認してください。
   - 答えが合っていても、途中式が全くデタラメな場合は減点してください。
   - ケアレスミス（符号ミスなど）か、根本的な理解不足かを判別してください。

3. **フィードバックの作成 (重要)**:
   - 単に「正解です」「残念です」だけでなく、画像の途中式に触れながら具体的なアドバイスをしてください。
   - 間違っている場合は「どこで間違えたか」を指摘してください。
   - 120文字以内で、生徒のやる気を損なわないトーンで書いてください。

4. **点数 (10点満点)**:
   - 全問正解かつ途中式も適切: 10点
   - 全問正解だが途中式なし/不十分: 8点
   - 答えは違うが途中式の考え方は合っている: 4~6点 (部分点)
   - 全て間違い: 0~2点

## 出力フォーマット
以下のJSON形式のみで出力してください。Markdownのコードブロック( \`\`\`json )は含めないでください。

{
  "score": 0〜10の整数,
  "feedback": "生徒へのフィードバック文字列",
  "isCorrect": 全ての問題が正解、または軽微なミスのみで合格レベルならtrue、それ以外はfalse
}`;

    const userContentText = `
## 問題文
${problemText}

## 正解と生徒の回答
${answerContext}

この情報を元に、添付画像の途中式も加味して採点してください。
`;

    try {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            {
                role: "system", // systemロールで役割を定義するのがベストプラクティスです
                content: systemPrompt
            },
            {
                role: "user",
                content: [
                    { type: "text", text: userContentText },
                ],
            },
        ];

        if (imageBase64) {
            const imageUrl = imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/png;base64,${imageBase64}`;

            // userメッセージのcontent配列に画像を追加
            (messages[1].content as any[]).push({
                type: "image_url",
                image_url: {
                    url: imageUrl,
                    detail: "high" // 細かい文字を読むためにhigh設定を推奨
                },
            });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // gpt-4o推奨 (Vision性能が高いため)
            messages: messages,
            response_format: { type: "json_object" },
            max_tokens: 500,
            temperature: 0.3, // 数学的な採点なので創造性を低く設定
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
            feedback: "採点中にエラーが発生しました。もう一度試してください。"
        };
    }
}
