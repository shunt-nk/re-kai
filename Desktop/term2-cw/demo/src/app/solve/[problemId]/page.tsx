'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PROBLEMS } from '@/data/mockData';
import RealTimeCanvas, { RealTimeCanvasHandle } from '@/components/features/RealTimeCanvas';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import styles from '../solve.module.css';

// Define a type for your problem structure if not already defined
interface Problem {
    id: string;
    title: string;
    text: string;
    timeLimit?: number; // Optional
    subject?: string;
    unit?: string;
    questions: { id: string; label: string; correctAnswer?: string; }[];
}

export default function SolvePage() {
    const router = useRouter();
    const params = useParams();
    const problemId = params.problemId as string;

    // Initialize problem state
    const [problem, setProblem] = useState<Problem | null>(null);

    // Timer Logic
    const [remainingTime, setRemainingTime] = useState(0);

    useEffect(() => {
        // 1. Try to find in static mock data
        let found = PROBLEMS.find(p => p.id === problemId);

        // 2. If not found, check localStorage for generated problems
        if (!found) {
            try {
                const cached = localStorage.getItem('generatedProblems');
                if (cached) {
                    const generatedList = JSON.parse(cached);
                    found = generatedList.find((p: any) => p.id === problemId);
                }
            } catch (e) {
                console.error("Failed to load from local storage", e);
            }
        }

        if (found) {
            setProblem(found);
            setRemainingTime(found.timeLimit || 0);
        } else {
            // Handle not found
        }
    }, [problemId]);

    const [elapsedTime, setElapsedTime] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionToken, setConnectionToken] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [hasStarted, setHasStarted] = useState(false); // New state for explicit start
    const [showWarning, setShowWarning] = useState(false); // Warning for clicking button while disconnected

    // Store answers for multiple questions: { q1: "...", q2: "..." }
    // Grading States
    const [gradingStatus, setGradingStatus] = useState<'idle' | 'loading' | 'complete'>('idle');
    const [score, setScore] = useState(0);

    // State for AI Feedback
    const [aiFeedback, setAiFeedback] = useState<string>('');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Initial Answers State (preserved from before)
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const canvasRef = useRef<RealTimeCanvasHandle>(null);
    const qrContainerRef = useRef<HTMLDivElement>(null);

    // Timer Effect
    useEffect(() => {
        if (!hasStarted || gradingStatus !== 'idle' || remainingTime <= 0) return;

        const interval = setInterval(() => {
            setRemainingTime(prev => Math.max(0, prev - 1));
            setElapsedTime(prev => prev + 1); // Keep tracking total time for stats
        }, 1000);

        return () => clearInterval(interval);
    }, [hasStarted, gradingStatus, remainingTime]);

    // Format Time Helper
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // QR Code Generation
    useEffect(() => {
        if (isModalOpen && connectionToken && qrContainerRef.current) {
            qrContainerRef.current.innerHTML = '';
            const host = window.location.host;
            const url = `${window.location.protocol}//${host}/tablet?token=${connectionToken}`;

            const canvas = document.createElement('canvas');
            QRCode.toCanvas(canvas, url, { width: 240, margin: 1, color: { dark: '#334155', light: '#ffffff' } }, (err: any) => {
                if (!err && qrContainerRef.current) qrContainerRef.current.appendChild(canvas);
            });
        }
    }, [connectionToken, isModalOpen]);

    const handleStart = () => {
        if (!isConnected) {
            setShowWarning(true);
            return;
        }
        setHasStarted(true);
        setIsModalOpen(false);
        setShowWarning(false);
    };

    const handleAnswerChange = (qId: string, val: string) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    if (!problem) return <div>問題が見つかりません</div>;

    const handleGrade = async () => {
        // Validation: Check if all questions are answered
        const allAnswered = problem.questions.every(q => (answers[q.id] || '').trim() !== '');
        if (!allAnswered) {
            setValidationError('全ての解答を入力してください');
            return;
        }
        setValidationError(null);

        setGradingStatus('loading');

        // Capture Canvas Image
        const image = canvasRef.current?.getImageData();

        // Submit Results to API
        const userId = localStorage.getItem('userId');
        if (userId) {
            try {
                const res = await fetch('/api/solve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        problemId: problem.id,
                        answers,
                        image, // Send base64 image
                        timeSpentSec: elapsedTime
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.grading) {
                        setScore(data.grading.score);
                        setAiFeedback(data.grading.feedback);
                    }
                }
            } catch (e) {
                console.error("Failed to save progress", e);
            }
        } else {
            // Fallback for no user ID (Demo)
            await new Promise(r => setTimeout(r, 2000));
            setScore(8);
            setAiFeedback("※ユーザー登録がないため、デモ用の点数を表示しています。");
        }

        setGradingStatus('complete');
    };

    return (
        <div className="solve-page-container">
            {/* Connection Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalTextContainer}>
                            <div className={styles.modalTextLine}>問題の回答を続けるには、</div>
                            <div className={styles.modalTextLine}>お手元のタブレット または スマートフォンでQRコードを読み込んでください。</div>
                        </div>
                        <div className={styles.qrFrame} ref={qrContainerRef}></div>
                        <div className="mt-8 w-full flex flex-col items-center">

                            {/* Warning Text */}
                            <div className={styles.connectionWarning}>
                                {showWarning && <span className="animate-pulse">タブレットを接続してください</span>}
                            </div>

                            {/* Answer Continue Button - Always Red/Green visible */}
                            <button
                                onClick={handleStart}
                                className={`${styles.btnAnswerContinue} ${isConnected ? styles.connected : styles.disconnected}`}
                            >
                                回答を続ける
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel: Questions & Inputs */}
            <div className="left-panel">
                <div style={{ flex: 1, overflowY: 'auto' }} className="custom-scrollbar">
                    {/* Header Info */}
                    <div className="problem-header-time">
                        残り時間 {formatTime(remainingTime)}
                    </div>

                    <h1 className="problem-title">
                        {problem.title}
                    </h1>

                    <p className="problem-text">
                        {problem.text}
                    </p>

                    <div style={{ marginBottom: '40px' }}>
                        {problem.questions.map((q, idx) => (
                            <div key={q.id}>
                                <div className="math-expression">
                                    <span className="mr-4">({idx + 1})</span>
                                    {/* Render LaTeX or simple text depending on content */}
                                    {q.label.includes('$$') ? (
                                        <span dangerouslySetInnerHTML={{ __html: katex.renderToString(q.label.replace(/\$\$/g, ''), { throwOnError: false }) }} />
                                    ) : (
                                        q.label
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="answer-section-title">回答入力</div>
                    <div style={{ marginBottom: '40px' }}>
                        {problem.questions.map((q, idx) => (
                            <div key={q.id} className="answer-row">
                                <span className="answer-label">({idx + 1})</span>
                                <input
                                    type="text"
                                    value={answers[q.id] || ''}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    className="answer-input"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {validationError && (
                        <div style={{
                            color: '#ff0000',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginBottom: '5px',
                            fontSize: '16px'
                        }}>
                            {validationError}
                        </div>
                    )}
                    <div className="btn-group">
                        <button
                            onClick={() => router.back()}
                            className="action-btn btn-suspend"
                            style={{ flex: 1 }}
                        >
                            中断して戻る
                        </button>
                        <button
                            onClick={handleGrade}
                            disabled={gradingStatus !== 'idle'}
                            className="action-btn btn-grade"
                        >
                            {gradingStatus === 'loading' ? '採点中...' : '採点する'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Canvas */}
            <div className="right-panel">
                {/* Connection Status Indicator */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="status-indicator"
                >
                    <span style={{ color: isConnected ? '#4b4b4b' : '#333' }}>
                        {isConnected ? 'タブレット接続済み' : 'タブレット未接続'}
                    </span>
                    <span className={`status-dot ${isConnected ? 'dot-green' : 'dot-red'}`} />
                </button>

                {/* Canvas Container */}
                <div className="canvas-frame" style={{ position: 'relative' }}>
                    {!isConnected && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.6)',
                            zIndex: 10
                        }}>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                style={{
                                    backgroundColor: '#4b4b4b',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                    cursor: 'pointer'
                                }}
                            >
                                タブレットを接続する
                            </button>
                        </div>
                    )}
                    <RealTimeCanvas
                        ref={canvasRef}
                        onConnectionChange={(connected, token) => {
                            setIsConnected(connected);
                            if (token) setConnectionToken(token);
                        }}
                        onStart={handleStart} // Pass the start handler
                        className="w-full h-full"
                    />
                </div>
            </div>
            {/* Loading Modal */}
            {gradingStatus === 'loading' && (
                <div className={styles.tabletModalOverlay}>
                    <div className={styles.tabletModalCard}>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            marginBottom: '20px',
                            color: '#333'
                        }}>
                            AI採点中...
                        </div>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            border: '5px solid #f3f3f3',
                            borderTop: '5px solid #3498db',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }}></div>
                        <style jsx>{`
                            @keyframes spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        `}</style>
                    </div>
                </div>
            )}

            {/* Grading Result Modal */}
            {gradingStatus === 'complete' && (
                <div className={styles.tabletModalOverlay}>
                    <div className={styles.tabletModalCard} onClick={e => e.stopPropagation()}>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            marginBottom: '20px',
                            color: '#333'
                        }}>
                            採点結果
                        </div>

                        <div style={{
                            fontSize: '48px',
                            fontWeight: 'bold',
                            color: '#ff6b6b',
                            marginBottom: '30px'
                        }}>
                            {score} / 10 点
                        </div>

                        <div style={{
                            width: '100%',
                            backgroundColor: '#f5f5f5',
                            padding: '20px',
                            borderRadius: '12px',
                            marginBottom: '30px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            fontSize: '16px',
                            lineHeight: '1.6',
                            color: '#444',
                            whiteSpace: 'pre-wrap'
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>AIからのフィードバック:</div>
                            {aiFeedback || 'フィードバックはありません'}
                        </div>

                        <div className={styles.buttonGroup}>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className={styles.btnHome}
                            >
                                ホームに戻る
                            </button>
                            <button
                                onClick={() => {
                                    setGradingStatus('idle');
                                    // Optionally clear answers or keep them
                                    // setAnswers({}); 
                                    setScore(0);
                                    setAiFeedback('');
                                    setValidationError(null);
                                }}
                                className={styles.btnRetry}
                            >
                                もう一度解く
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
