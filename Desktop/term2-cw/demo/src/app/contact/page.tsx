'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';
import { useRouter } from 'next/navigation';

export default function ContactPage() {
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState('general');
    const [message, setMessage] = useState('');

    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !message) {
            alert('すべての項目を入力してください。');
            return;
        }

        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSubmitting(false);
        setIsSent(true);
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
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 10px 0' }}>お問い合わせ</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>ご質問やご意見をお聞かせください。</p>
                    </div>

                    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>

                        {isSent ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f0f9ff', borderRadius: '12px', border: '1px solid #bce3ff' }}>
                                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✉️</div>
                                <h2 style={{ color: '#005a9e', marginBottom: '10px' }}>送信完了日</h2>
                                <p style={{ color: '#444', lineHeight: '1.6' }}>
                                    お問い合わせありがとうございます。<br />
                                    内容を確認の上、担当者よりご連絡させていただきます。
                                </p>
                                <div style={{ marginTop: '30px' }}>
                                    <button
                                        onClick={() => router.push('/')}
                                        style={{
                                            padding: '12px 30px',
                                            backgroundColor: '#0070f3',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ホームへ戻る
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>お名前 <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="山田 太郎"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>メールアドレス <span style={{ color: 'red' }}>*</span></label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="example@mail.com"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>お問い合わせ種別</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', backgroundColor: 'white' }}
                                    >
                                        <option value="general">一般的なご質問</option>
                                        <option value="bug">不具合の報告</option>
                                        <option value="feature">機能リクエスト</option>
                                        <option value="other">その他</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '30px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>お問い合わせ内容 <span style={{ color: 'red' }}>*</span></label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="具体的な内容をご記入ください..."
                                        rows={6}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px', resize: 'vertical' }}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        backgroundColor: '#0070f3',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        cursor: isSubmitting ? 'wait' : 'pointer',
                                        opacity: isSubmitting ? 0.7 : 1,
                                        boxShadow: '0 4px 12px rgba(0, 112, 243, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isSubmitting ? '送信中...' : '送信する'}
                                </button>
                            </form>
                        )}

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
