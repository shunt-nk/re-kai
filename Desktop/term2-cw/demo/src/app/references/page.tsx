'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';
import { useRouter } from 'next/navigation';
import { REFERENCES_DATA } from '@/data/mockData';
import katex from 'katex';

export default function ReferencesPage() {
    const router = useRouter();
    const [selectedSubject, setSelectedSubject] = useState(REFERENCES_DATA[0].subject);

    const currentData = REFERENCES_DATA.find(d => d.subject === selectedSubject);

    // Helpers to render LaTeX content
    const renderContent = (text: string) => {
        // Split by $$ for block math first
        const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);

        return parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
                // Block math - Render inline as per user request
                const math = part.slice(2, -2);
                try {
                    // Using displaystyle for better visibility but keeping it inline
                    const html = katex.renderToString('\\displaystyle ' + math, { displayMode: false });
                    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
                } catch (e) {
                    return <span key={index}>{part}</span>;
                }
            } else if (part.startsWith('$') && part.endsWith('$')) {
                // Inline math
                const math = part.slice(1, -1);
                try {
                    const html = katex.renderToString(math, { displayMode: false });
                    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
                } catch (e) {
                    return <span key={index}>{part}</span>;
                }
            } else {
                // Regular text (handle newlines)
                return <span key={index}>{part}</span>;
            }
        });
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
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 10px 0' }}>数学 参考文献</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>公式や重要ポイントのまとめ</p>
                    </div>

                    {/* Subject Tabs */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '40px', flexWrap: 'wrap' }}>
                        {REFERENCES_DATA.map((data) => (
                            <button
                                key={data.subject}
                                onClick={() => setSelectedSubject(data.subject)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '25px',
                                    border: selectedSubject === data.subject ? `2px solid ${data.color}` : '1px solid #ddd',
                                    backgroundColor: selectedSubject === data.subject ? `${data.color}15` : 'white',
                                    color: selectedSubject === data.subject ? data.color : '#666',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {data.subject}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                        {currentData ? (
                            currentData.units.map((unit, idx) => (
                                <div key={idx} style={{ marginBottom: '40px' }}>
                                    <h2 style={{
                                        fontSize: '22px',
                                        color: '#333',
                                        borderBottom: `2px solid ${currentData.color}`,
                                        paddingBottom: '10px',
                                        marginBottom: '20px'
                                    }}>
                                        {unit.unit}
                                    </h2>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                        {unit.topics.map((topic, tIdx) => (
                                            <div key={tIdx} style={{
                                                backgroundColor: '#f9fbfd',
                                                borderRadius: '12px',
                                                padding: '20px',
                                                border: '1px solid #eee',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                                            }}>
                                                <h3 style={{ margin: '0 0 10px 0', color: currentData.color, fontSize: '18px' }}>
                                                    {topic.title}
                                                </h3>
                                                <div style={{
                                                    lineHeight: '1.8',
                                                    color: '#444',
                                                    fontSize: '15px',
                                                    backgroundColor: 'white',
                                                    padding: '15px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #f0f0f0',
                                                    textAlign: 'left',
                                                    whiteSpace: 'pre-wrap'
                                                }}>
                                                    {renderContent(topic.content)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                データが見つかりません。
                            </div>
                        )}
                    </div>

                </div>
            </main>
            <Footer />
        </div>
    );
}
