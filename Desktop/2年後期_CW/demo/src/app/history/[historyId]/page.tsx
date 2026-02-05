'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { HistoryRecord } from '@/lib/db';
import styles from '../../dashboard/dashboard.module.css';

export default function HistoryDetailPage() {
    const params = useParams();
    const router = useRouter();
    const historyId = params.historyId as string;
    const [history, setHistory] = useState<HistoryRecord | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/history?id=${historyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setHistory(data.history);
                }
            } catch (error) {
                console.error('Failed to fetch history:', error);
            }
        };
        fetchHistory();
    }, [historyId]);

    if (!history) return <div className="p-10 text-center">読み込み中...</div>;

    // Helper for badge style
    const getBadgeStyle = (subject: string) => {
        switch (subject) {
            case '数I': return { borderColor: '#1cb0f6', color: '#1cb0f6' };
            case '数A': return { borderColor: '#9059ff', color: '#9059ff' };
            case '数II': return { borderColor: '#2bcdff', color: '#2bcdff' };
            default: return { borderColor: '#3c3c3c', color: '#3c3c3c' };
        }
    };
    const badgeStyle = getBadgeStyle(history.subject);


    return (
        <div className={styles.dashboardContainer}>
            <Header />

            <main className={styles.contentWrapper}>
                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => router.back()}
                        style={{ background: 'none', border: 'none', color: '#8898aa', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                    >
                        &lt; 戻る
                    </button>
                </div>

                <div className={styles.heroCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    {/* Header: Title & Score */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                        <div>
                            <div style={{
                                display: 'inline-block',
                                border: `1.5px solid ${badgeStyle.borderColor}`,
                                color: badgeStyle.color,
                                borderRadius: '20px',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                marginBottom: '10px'
                            }}>
                                {history.subject} / {history.unit}
                            </div>
                            <h1 className={styles.sectionTitle} style={{ margin: '0', textAlign: 'left', fontSize: '28px' }}>
                                {history.problemTitle}
                            </h1>
                            <p style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
                                {new Date(history.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#888' }}>スコア</div>
                            <div style={{ fontSize: '48px', fontWeight: '800', color: '#ff6b6b' }}>
                                {history.score}<span style={{ fontSize: '20px', color: '#ccc' }}>/10</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>

                        {/* Feedback */}
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#555', marginBottom: '15px', borderLeft: '4px solid #1cb0f6', paddingLeft: '10px' }}>
                                AIフィードバック
                            </h3>
                            <div style={{ backgroundColor: '#f9fbfd', padding: '20px', borderRadius: '15px', lineHeight: '1.8', color: '#444' }}>
                                {history.aiFeedback}
                            </div>
                        </div>

                        {/* Answers */}
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#555', marginBottom: '15px', borderLeft: '4px solid #1cb0f6', paddingLeft: '10px' }}>
                                回答詳細
                            </h3>
                            <div style={{ backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '15px', padding: '20px' }}>
                                {Object.entries(history.answers).map(([key, val], idx) => (
                                    <div key={key} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', padding: '15px 0' }}>
                                        <div style={{ width: '60px', fontWeight: 'bold', color: '#888' }}>Q{idx + 1}</div>
                                        <div style={{ flex: 1, fontWeight: 'bold', color: '#333' }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Image */}
                        {history.imageBase64 && (
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#555', marginBottom: '15px', borderLeft: '4px solid #1cb0f6', paddingLeft: '10px' }}>
                                    手書きメモ
                                </h3>
                                <div style={{ border: '2px dashed #eee', borderRadius: '15px', padding: '10px', overflow: 'hidden' }}>
                                    <img src={history.imageBase64} alt="Canvas" style={{ width: '100%', borderRadius: '10px' }} />
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
