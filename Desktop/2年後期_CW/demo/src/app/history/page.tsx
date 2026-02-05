'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';
import { useRouter } from 'next/navigation';
import { HistoryRecord } from '@/lib/db';

export default function HistoryPage() {
    const router = useRouter();
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/history?userId=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data.history || []);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
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
                <h1 className={styles.sectionTitle} style={{ marginTop: '20px' }}>解答履歴一覧</h1>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        読み込み中...
                    </div>
                ) : history.length === 0 ? (
                    <div className={styles.heroCard} style={{ justifyContent: 'center', color: '#666' }}>
                        解答履歴はまだありません。
                    </div>
                ) : (
                    <div className={styles.gridContainer}>
                        {history.map((record) => (
                            <div
                                key={record.id}
                                className={styles.card}
                                onClick={() => router.push(`/history/${record.id}`)}
                            >
                                <span className={`${styles.badge} ${getBadgeClass(record.subject)}`}>
                                    {record.subject}
                                </span>
                                <div className={styles.cardMeta}>
                                    {new Date(record.createdAt).toLocaleDateString()}
                                </div>
                                <h4 className={styles.cardTitle}>{record.problemTitle}</h4>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>
                                        スコア: <span style={{ color: '#ff6b6b', fontSize: '16px' }}>{record.score}</span>/10
                                    </div>
                                    <div className={styles.viewDetails}>詳細を見る</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
