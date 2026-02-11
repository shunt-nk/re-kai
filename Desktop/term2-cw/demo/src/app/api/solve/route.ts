import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // ※ここは実際のdb.tsの場所に合わせる
import { PROBLEMS } from '@/data/mockData';
import { gradeWithOpenAI } from '@/lib/openai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, problemId, answers, image, timeSpentSec } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // 【修正1】ユーザー取得を待つ (await)
        const user = await db.getUserById(userId);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const problem = PROBLEMS.find(p => p.id === problemId);
        if (!problem) {
            return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
        }

        // AI Grading
        const aiResult = await gradeWithOpenAI(
            image, // canvas base64
            problem.text,
            problem.questions,
            answers
        );

        // Calculate updates based on AI Result
        let { level, currentExp, maxExp, totalQuestions, totalStudyTimeHours } = user;

        // Update Study Time
        const currentTotalSec = (totalStudyTimeHours || 0) * 3600;
        const newTotalSec = currentTotalSec + (timeSpentSec || 0);
        const newTotalHours = Math.round((newTotalSec / 3600) * 10) / 10;

        // Update Questions
        if (aiResult.isCorrect) {
            totalQuestions = (totalQuestions || 0) + 1;

            // EXP Gain based on score (e.g. Score * 2)
            const expGain = aiResult.score * 2;
            currentExp += expGain;

            if (currentExp >= maxExp) {
                level += 1;
                currentExp = currentExp - maxExp;
                maxExp = Math.floor(maxExp * 1.2);
            }
        }

        // 【修正2】ステータス更新完了を待つ (await)
        await db.updateUserStats(userId, {
            level,
            currentExp,
            maxExp,
            totalQuestions,
            totalStudyTimeHours: newTotalHours
        });

        // Save detailed history
        // 【修正3】履歴保存完了を待つ (await)
        await db.saveHistory({
            userId,
            problemId,
            problemTitle: problem.title,
            subject: problem.subject,
            unit: problem.unit,
            score: aiResult.score,
            answers,
            isCorrect: aiResult.isCorrect,
            timeSpentSec: timeSpentSec || 0,
            aiFeedback: aiResult.feedback,
            imageBase64: image
        });

        return NextResponse.json({
            success: true,
            grading: aiResult, // Return score and feedback to client
            updates: {
                level,
                currentExp,
                maxExp,
                totalQuestions,
                totalStudyTimeHours: newTotalHours
            }
        });

    } catch (error) {
        console.error('Solve Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}