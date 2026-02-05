'use client';

import React, { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';
import { useRouter } from 'next/navigation';
import { SUBJECT_SELECTIONS, UNITS, PROBLEMS } from '@/data/mockData';

export default function RandomPage() {
    const router = useRouter();
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Filter units based on subject
    const filteredUnits = selectedSubject
        ? UNITS.filter(u => u.courseCategory === SUBJECT_SELECTIONS.find(m => m.title === selectedSubject)?.id)
        : [];

    const handleGenerate = async () => {
        setIsGenerating(true);

        // Simulate AI generation delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find matching problems
        let candidates = PROBLEMS;
        if (selectedSubject) {
            candidates = candidates.filter(p => p.subject === selectedSubject);
        }
        if (selectedUnit) {
            // Find unit title
            const unit = UNITS.find(u => u.id === selectedUnit);
            if (unit) {
                candidates = candidates.filter(p => p.unit === unit.title);
            }
        }

        // Pick random
        const targetProblem = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : PROBLEMS[Math.floor(Math.random() * PROBLEMS.length)]; // Fallback

        router.push(`/solve/${targetProblem.id}`);
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
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 20px 0' }}>ランダム問題生成</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>教科と単元を選択し、あなただけの問題を生成します。</p>
                    </div>

                    {isGenerating ? (
                        <div style={{ textAlign: 'center', padding: '60px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>✨</div>
                            <h3 style={{ fontSize: '24px', color: '#333', marginBottom: '10px' }}>AIが問題を生成中...</h3>
                            <p style={{ color: '#888' }}>最適な難易度と内容を調整しています</p>
                        </div>
                    ) : (
                        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>

                            {/* Step 1: Subject */}
                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                                    1. 教科を選択
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                    {SUBJECT_SELECTIONS.map(sub => (
                                        <button
                                            key={sub.id}
                                            onClick={() => {
                                                setSelectedSubject(sub.title);
                                                setSelectedUnit(null); // Reset unit
                                            }}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '10px',
                                                border: selectedSubject === sub.title ? `2px solid ${sub.color}` : '1px solid #ddd',
                                                backgroundColor: selectedSubject === sub.title ? `${sub.color}15` : 'white',
                                                color: selectedSubject === sub.title ? sub.color : '#666',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {sub.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Step 2: Unit */}
                            <div style={{ marginBottom: '40px', opacity: selectedSubject ? 1 : 0.5, pointerEvents: selectedSubject ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', color: '#333' }}>
                                    2. 単元を選択 (任意)
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {filteredUnits.length > 0 ? filteredUnits.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setSelectedUnit(selectedUnit === u.id ? null : u.id)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                border: selectedUnit === u.id ? '2px solid #5aa9fa' : '1px solid #ddd',
                                                backgroundColor: selectedUnit === u.id ? '#eaf6ff' : 'white',
                                                color: selectedUnit === u.id ? '#0070f3' : '#666',
                                                fontSize: '14px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {u.title}
                                        </button>
                                    )) : (
                                        <div style={{ color: '#999', fontSize: '14px', padding: '10px' }}>教科を選択してください</div>
                                    )}
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedSubject}
                                style={{
                                    width: '100%',
                                    padding: '18px',
                                    backgroundColor: selectedSubject ? '#3cd13c' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: selectedSubject ? 'pointer' : 'not-allowed',
                                    boxShadow: selectedSubject ? '0 4px 15px rgba(60, 209, 60, 0.4)' : 'none',
                                    transition: 'all 0.3s'
                                }}
                            >
                                問題を生成して解く
                            </button>

                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
