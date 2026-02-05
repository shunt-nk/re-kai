'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from './register.module.css';

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userName', data.user.name); // Optional, for quick access
                router.push('/dashboard');
            } else {
                const err = await res.json();
                alert('登録エラー: ' + (err.error || '不明なエラー'));
            }
        } catch (error) {
            console.error('Registration failed:', error);
            alert('通信エラーが発生しました');
        }
    };

    return (
        <div className={styles.container}>
            <Header />

            <main className={styles.contentWrapper}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>アカウント作成</h1>
                        <p className={styles.subtitle}>無料で学習をスタートしましょう</p>
                    </div>

                    <form onSubmit={handleRegister} className={styles.form}>
                        <div>
                            <label className={styles.label}>お名前</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例: 中平 隼太"
                                className={styles.input}
                                required
                            />
                        </div>

                        <div>
                            <label className={styles.label}>メールアドレス</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className={styles.input}
                                required
                            />
                        </div>

                        <div>
                            <label className={styles.label}>パスワード</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={styles.input}
                                required
                            />
                        </div>

                        <button type="submit" className={styles.submitBtn}>
                            アカウントを作成
                        </button>
                    </form>

                    <div className={styles.linkContainer}>
                        <Link href="/dashboard" className={styles.link}>
                            すでにアカウントをお持ちの方 (デモ:直接ダッシュボードへ)
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
