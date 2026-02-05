'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';

export default function AboutPage() {
    return (
        <div className={styles.dashboardContainer}>
            <Header />
            <main className={styles.contentWrapper}>

                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={() => window.history.back()}
                        style={{ background: 'none', border: 'none', color: '#8898aa', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
                    >
                        &lt; 戻る
                    </button>
                </div>

                <div className={styles.heroCard} style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 20px' }}>
                    <h1 style={{ fontSize: '36px', fontWeight: 'bold', color: '#0070f3', marginBottom: '10px' }}>RE:KAI</h1>
                    <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px', letterSpacing: '0.05em' }}>
                        AIが導く、あなただけの「解」
                    </p>

                    <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left' }}>

                        {/* 1. Name Origin */}
                        <section style={{ marginBottom: '50px' }}>
                            <div style={{ padding: '30px', backgroundColor: '#f9fbfd', borderRadius: '16px', border: '1px solid #eef2f6' }}>
                                <h2 style={{ textAlign: 'center', fontSize: '22px', marginBottom: '30px', color: '#333' }}>
                                    <span style={{ borderBottom: '2px solid #0070f3', paddingBottom: '5px' }}>RE:KAI とは</span>
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '500px' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0070f3', width: '80px' }}>RE</div>
                                        <div style={{ flex: 1, color: '#555', fontSize: '15px' }}>
                                            <strong>Repeat / Retry / Revise</strong><br />
                                            反復し、再挑戦し、修正する。学習のプロセス。
                                        </div>
                                    </div>
                                    <div style={{ width: '2px', height: '20px', backgroundColor: '#ddd' }}></div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '500px' }}>
                                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#3cd13c', width: '80px' }}>KAI</div>
                                        <div style={{ flex: 1, color: '#555', fontSize: '15px' }}>
                                            <strong>"解" (Solution) / "理解" (Understanding)</strong><br />
                                            正解への到達と、深い理解を得ること。
                                        </div>
                                    </div>
                                </div>
                                <p style={{ marginTop: '30px', textAlign: 'center', lineHeight: '1.8', color: '#444' }}>
                                    RE:KAIは、ただ問題を解くだけではありません。<br />
                                    AIがあなたの学習傾向を分析し、最適なタイミングで「解き直す」べき問題を提示。<br />
                                    確実な「理解」へと導く、次世代の学習プラットフォームです。
                                </p>
                            </div>
                        </section>

                        {/* 2. Features */}
                        <section style={{ marginBottom: '40px' }}>
                            <h2 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '40px', color: '#333' }}>3つの特徴</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                                {/* Feature 1 */}
                                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '15px', textAlign: 'center' }}>🎯</div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', color: '#333' }}>パーソナライズ</h3>
                                    <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                                        あなたの得意・不得意をAIが瞬時に分析。今のレベルに最適な難易度の問題を自動生成・推奨します。
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '15px', textAlign: 'center' }}>📊</div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', color: '#333' }}>可視化される成長</h3>
                                    <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                                        日々の学習時間や正答率をグラフ化。自分の成長が目に見えるので、モチベーションが続きます。
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
                                    <div style={{ fontSize: '32px', marginBottom: '15px', textAlign: 'center' }}>🚀</div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', color: '#333' }}>効率的な復習</h3>
                                    <p style={{ color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
                                        忘却曲線を意識したリコメンド機能により、忘れかけた頃に復習問題を提示。記憶の定着をサポートします。
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div style={{ marginTop: '50px', textAlign: 'center' }}>
                            <Link href="/" className={styles.recommendBtn} style={{ textDecoration: 'none', display: 'inline-block', lineHeight: '50px', padding: '0 40px', fontSize: '18px' }}>
                                学習を始める
                            </Link>
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
