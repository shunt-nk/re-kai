'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';
import { useRouter } from 'next/navigation';
import { CURRENT_USER } from '@/data/mockData';

export default function SettingsPage() {
    const router = useRouter();
    const [name, setName] = useState(CURRENT_USER.name);
    const [email, setEmail] = useState('demo@example.com'); // Mock email
    const [targetLevel, setTargetLevel] = useState('MARCHレベル');
    const [weakSubjects, setWeakSubjects] = useState<string[]>(['数B']);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsSaving(false);
        setSaveMessage('設定を保存しました！');

        // Hide message after 3 seconds
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const toggleWeakSubject = (subject: string) => {
        if (weakSubjects.includes(subject)) {
            setWeakSubjects(weakSubjects.filter(s => s !== subject));
        } else {
            setWeakSubjects([...weakSubjects, subject]);
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
                    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 10px 0' }}>設定</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>アカウントや学習設定の変更</p>
                    </div>

                    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>

                        {/* 1. Account Settings */}
                        <section style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', color: '#333' }}>
                                アカウント設定
                            </h2>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>名前</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>メールアドレス</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #eee', backgroundColor: '#f9f9f9', color: '#999', fontSize: '16px' }}
                                />
                            </div>
                        </section>

                        {/* 2. Learning Settings */}
                        <section style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', color: '#333' }}>
                                学習設定
                            </h2>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>志望校レベル</label>
                                <select
                                    value={targetLevel}
                                    onChange={(e) => setTargetLevel(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', backgroundColor: 'white' }}
                                >
                                    <option value="共通テストレベル">共通テストレベル</option>
                                    <option value="MARCHレベル">MARCHレベル</option>
                                    <option value="早慶レベル">早慶レベル</option>
                                    <option value="東大・京大レベル">東大・京大レベル</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>重点的に学習したい科目（苦手科目）</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {['数I', '数A', '数II', '数B'].map(sub => (
                                        <button
                                            key={sub}
                                            onClick={() => toggleWeakSubject(sub)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '20px',
                                                border: weakSubjects.includes(sub) ? '2px solid #ff9600' : '1px solid #ddd',
                                                backgroundColor: weakSubjects.includes(sub) ? '#fff5e6' : 'white',
                                                color: weakSubjects.includes(sub) ? '#d97700' : '#666',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            {sub}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* 3. App Settings */}
                        <section style={{ marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px', color: '#333' }}>
                                アプリ設定
                            </h2>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px 0' }}>
                                <span style={{ fontSize: '16px', color: '#555' }}>効果音</span>
                                <div
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                    style={{
                                        width: '50px', height: '28px', backgroundColor: soundEnabled ? '#3cd13c' : '#ccc',
                                        borderRadius: '14px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%',
                                        position: 'absolute', top: '2px', left: soundEnabled ? '24px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px 0' }}>
                                <span style={{ fontSize: '16px', color: '#555' }}>ダークモード (β版)</span>
                                <div
                                    onClick={() => setDarkMode(!darkMode)}
                                    style={{
                                        width: '50px', height: '28px', backgroundColor: darkMode ? '#3cd13c' : '#ccc',
                                        borderRadius: '14px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '24px', height: '24px', backgroundColor: 'white', borderRadius: '50%',
                                        position: 'absolute', top: '2px', left: darkMode ? '24px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }} />
                                </div>
                            </div>
                        </section>

                        {/* Save Button */}
                        <div style={{ position: 'sticky', bottom: '20px', textAlign: 'center' }}>
                            {saveMessage && (
                                <div style={{
                                    marginBottom: '10px', padding: '10px', backgroundColor: '#e6fffa', color: '#00947e',
                                    borderRadius: '8px', fontWeight: 'bold', animation: 'fadeIn 0.3s'
                                }}>
                                    {saveMessage}
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: '#0070f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    cursor: isSaving ? 'wait' : 'pointer',
                                    opacity: isSaving ? 0.7 : 1,
                                    boxShadow: '0 4px 12px rgba(0, 112, 243, 0.3)'
                                }}
                            >
                                {isSaving ? '保存中...' : '変更を保存'}
                            </button>
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
