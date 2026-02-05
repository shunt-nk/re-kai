'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../../dashboard/dashboard.module.css';

export default function UnitPage() {
    const params = useParams();
    const unitId = params.unitId;

    return (
        <div className={styles.dashboardContainer}>
            <Header />
            <main className={styles.contentWrapper}>
                <div className={styles.heroCard} style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    minHeight: '60vh',
                    justifyContent: 'center'
                }}>
                    <h1 className={styles.sectionTitle} style={{ marginTop: 0 }}>単元: {unitId}</h1>
                    <p style={{ color: '#666', marginBottom: '40px' }}>このページは現在準備中です。</p>
                    <Link href="/" className={styles.recommendBtn} style={{
                        display: 'inline-block',
                        lineHeight: '44px',
                        textDecoration: 'none',
                        color: 'white'
                    }}>
                        ホームに戻る
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
