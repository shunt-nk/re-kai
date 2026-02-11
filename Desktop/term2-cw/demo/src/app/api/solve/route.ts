import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // ※ここは実際のdb.tsの場所に合わせる
import { PROBLEMS } from '@/data/mockData';
import { gradeWithOpenAI } from '@/lib/openai';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, problemId, answers, image, timeSpentSec } = body;

        // userId is optional now
        // if (!userId) {
        //     return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        // }

        let user = null;
        if (userId) {
            try {
                user = await db.getUserById(userId);
            } catch (dbError) {
                console.warn("Database error (getUserById):", dbError);
                // Continue without user
            }
        }

        let problem = PROBLEMS.find(p => p.id === problemId);

        // Fallback: Use problem data provided by client (for generated problems)
        if (!problem && body.problemData) {
            problem = body.problemData;
        }

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

        // Database Updates (User Stats & History)
        let updates = null;
        if (userId && user) {
            try {
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

                updates = {
                    level,
                    currentExp,
                    maxExp,
                    totalQuestions,
                    totalStudyTimeHours: newTotalHours
                };

                await db.updateUserStats(userId, updates);

                // Save detailed history
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

            } catch (dbError) {
                console.error("Database update failed:", dbError);
                // Ignore DB errors to ensure grading result is returned
            }
        }

        return NextResponse.json({
            success: true,
            grading: aiResult, // Return score and feedback to client
            updates: updates // Might be null
        });

    } catch (error) {
        console.error('Solve Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}