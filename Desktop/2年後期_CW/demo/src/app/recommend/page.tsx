'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';
import { useRouter } from 'next/navigation';
import { PROBLEMS } from '@/data/mockData';
import { HistoryRecord } from '@/lib/db';

export default function RecommendPage() {
    const router = useRouter();
    const [recommendedParams, setRecommendedParams] = useState<{
        reason: string;
        problems: typeof PROBLEMS;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const analyzeAndRecommend = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                // Default fallback for guest/demo
                setRecommendedParams({
                    reason: "まずは基礎から始めましょう。数学Iの基本的な問題をおすすめします。",
                    problems: PROBLEMS.filter(p => p.subject === '数I').slice(0, 4)
                });
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/history?userId=${userId}`);
                let history: HistoryRecord[] = [];
                if (res.ok) {
                    const data = await res.json();
                    history = data.history || [];
                }

                // Simple Analysis Logic
                if (history.length === 0) {
                    setRecommendedParams({
                        reason: "解答履歴がまだありません。まずは人気の基礎問題からスタートしてみましょう！",
                        problems: PROBLEMS.slice(0, 4) // Just pick first 4 as starter
                    });
                } else {
                    const lastRecord = history[0]; // Most recent
                    const recentScore = lastRecord.score;
                    const recentSubject = lastRecord.subject;

                    if (recentScore < 6) {
                        // Low score -> Suggest review or easier problems in same subject
                        const text = `前回の「${lastRecord.problemTitle}」では少し苦戦したようです。同じ単元の基礎問題で復習してみましょう。`;
                        // Find problems in same subject, ideally similar unit, exclude the one just done if possible
                        let recs = PROBLEMS.filter(p => p.subject === recentSubject && p.id !== lastRecord.problemId);
                        if (recs.length === 0) recs = PROBLEMS.slice(0, 4); // Fallback
                        setRecommendedParams({
                            reason: text,
                            problems: recs.slice(0, 4)
                        });
                    } else {
                        // High score -> Suggest next step or harder
                        const text = `前回の「${lastRecord.problemTitle}」は素晴らしい出来でした！次は少しレベルを上げた問題や、応用問題に挑戦してみませんか？`;
                        // Filter for same subject but maybe different unit or generally "next"
                        let recs = PROBLEMS.filter(p => p.subject === recentSubject && p.id !== lastRecord.problemId);
                        // Shuffle or pick logic could be better, but simple slice is fine for demo
                        if (recs.length === 0) recs = PROBLEMS.filter(p => p.subject !== recentSubject); // Try other subjects
                        setRecommendedParams({
                            reason: text,
                            problems: recs.slice(0, 4)
                        });
                    }
                }

            } catch (error) {
                console.error("Analysis failed", error);
                // Fallback on error
                setRecommendedParams({
                    reason: "通信エラーが発生しました。人気のおすすめ問題を表示します。",
                    problems: PROBLEMS.slice(0, 4)
                });
            } finally {
                setLoading(false);
            }
        };

        analyzeAndRecommend();
    }, []);

    // Helper to determine badge style (reusing logic from dashboard)
    const getBadgeClass = (subject: string) => {
        switch (subject) {
            case '数I': return styles.badgeMath1;
            case '数A': return styles.badgeMathA;
            case '数II': return styles.badgeMath2;
            case '数B': return styles.badgeMathB;
            default: return styles.badgeMath1;
        }
    };

    return (
        <div className={styles.dashboardContainer}>
            <Header />

            <main className={styles.contentWrapper} style={{ minHeight: '60vh' }}>
                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{ background: 'none', border: 'none', color: '#8898aa', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                    >
                        &lt; 戻る
                    </button>
                </div>

                <div className={styles.heroCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 20px 0' }}>AI分析によるおすすめ問題</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>あなたの学習データを分析し、最適な問題をピックアップしました。</p>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Analysis in progress...</div>
                    ) : (
                        <>
                            {/* Analysis Result Box */}
                            <div style={{
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #bce3ff',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px'
                            }}>
                                <div style={{ fontSize: '24px' }}>💡</div>
                                <div style={{ color: '#005a9e', fontWeight: 'bold', lineHeight: '1.5' }}>
                                    {recommendedParams?.reason}
                                </div>
                            </div>

                            {/* Problem Grid */}
                            <div className={styles.gridContainer}>
                                {recommendedParams?.problems.map((p, i) => (
                                    <div
                                        key={i}
                                        className={styles.card}
                                        onClick={() => router.push(`/solve/${p.id}`)}
                                    >
                                        <span className={`${styles.badge} ${getBadgeClass(p.subject)}`}>
                                            {p.subject}
                                        </span>
                                        <div className={styles.cardMeta}>{p.unit}</div>
                                        <h4 className={styles.cardTitle}>{p.title}</h4>
                                        <button className={styles.cardBtn}>問題を解く</button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
