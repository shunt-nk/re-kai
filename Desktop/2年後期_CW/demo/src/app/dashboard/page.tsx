'use client';

import React from 'react';
import { CURRENT_USER, PROBLEMS, SUBJECT_SELECTIONS } from '@/data/mockData';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Reusable Problem Card
const DashboardProbCard = ({
    title,
    subject,
    unit,
    badgeClass,
    buttonText = '問題を解く',
    onClick,
    isHistory = false
}: {
    title: string,
    subject: string,
    unit: string,
    badgeClass: string,
    buttonText?: string,
    onClick: () => void,
    isHistory?: boolean
}) => {
    return (
        <div className={styles.card} onClick={onClick}>
            <span className={`${styles.badge} ${badgeClass}`}>
                {subject}
            </span>
            <div className={styles.cardMeta}>{unit}</div>
            <h4 className={styles.cardTitle}>{title}</h4>

            {isHistory ? (
                <div className={styles.viewDetails}>詳細を見る</div>
            ) : (
                <button className={styles.cardBtn}>{buttonText}</button>
            )}
        </div>
    );
};

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = React.useState(CURRENT_USER);
    const [history, setHistory] = React.useState<any[]>([]);

    // Determine badge class helper
    const getBadgeClass = (subject: string, level?: number) => {
        if (level === 1) return styles.badgeLv1;
        if (level === 3) return styles.badgeLv3;
        if (level === 4) return styles.badgeLv4;

        switch (subject) {
            case '数I': case '数学I': return styles.badgeMath1;
            case '数A': case '数学A': return styles.badgeMathA;
            case '数II': case '数学II': return styles.badgeMath2;
            case '数B': case '数学B': return styles.badgeMathB;
            case '科学': case '物理': case '化学': return styles.badgeScience;
            case '日本史': case '社会': return styles.badgeJPHistory;
            case '世界史': return styles.badgeWorldHistory;
            default: return styles.badgeMath1;
        }
    };

    React.useEffect(() => {
        const fetchUserData = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            try {
                // Fetch User Stats
                const userRes = await fetch(`/api/user?id=${userId}`);
                if (userRes.ok) {
                    const data = await userRes.json();
                    setUser(data.user);
                }
                // Fetch History
                const histRes = await fetch(`/api/history?userId=${userId}`);
                if (histRes.ok) {
                    const data = await histRes.json();
                    if (data.history) {
                        setHistory(data.history.slice(0, 4)); // Top 4
                    }
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };
        fetchUserData();
    }, []);

    // Static Data Mapping for UI Sections (Mocking the exact problems for the layout)
    // Static Data Mapping for UI Sections (Mocking the exact problems for the layout)
    // Find one problem per subject from selections
    const subjectProblems = SUBJECT_SELECTIONS.map(sel => {
        // Try to find a problem that matches this subject title (e.g. '数学I' or '科学' or '日本史' which maps to '日本史' subject in problems)
        // Note: For Science/Society, we have subjects like '物理' so we might need loose matching or just pick 'any' from that category.
        // Actually, SUBJECT_SELECTIONS has titles like '科学' but PROBLEMS have subjects like '科学' or '物理'.
        // Let's create a map or simplistic finder.
        // Math subjects: MATCH EXACTLY '数学I', '数学A', '数学II', '数学B'
        // Science: '科学' (selection) vs '科学' (problem). Wait, units have `subject: '物理'` or `'化学'` but we set `subject: '科学'` for some problems?
        // Let's re-read PROBLEMS.
        // Math I -> subject: '数学I'
        // Science -> subject: '科学'
        // JP History -> subject: '日本史'
        // World History -> subject: '世界史'
        // So simple matching on `sel.title` should work for broad categories.

        return PROBLEMS.find(p => p.subject === sel.title) || PROBLEMS[0];
    }).filter((p, index, self) =>
        // Unique by ID to prevent duplicates if fallback is used
        index === self.findIndex(t => t.id === p.id)
    );
    const levelProblems = PROBLEMS.slice(0, 4); // Just reusing for demo
    const weaknessProblems = PROBLEMS.slice(0, 4);

    return (
        <div className={styles.dashboardContainer}>
            <Header />

            <main className={styles.contentWrapper}>

                {/* Hero Section */}
                <div className={styles.heroCard}>
                    {/* Left: User Stats */}
                    <div className={styles.profileSection}>
                        <div className={styles.profileHeader}>
                            <div className={styles.profileIcon}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <h2 className={styles.profileName}>{user.name}</h2>
                        </div>
                        <div className={styles.statsList}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>現在のレベル</span>
                                <span className={styles.statValue}>{user.level}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>ランキング</span>
                                <span className={styles.statValue}>{user.ranking}</span>
                                <span className={styles.statUnit}>位</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>累計解答数</span>
                                <span className={styles.statValue}>{user.totalQuestions}</span>
                                <span className={styles.statUnit}>問</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>総学習時間</span>
                                <span className={styles.statValue}>{user.totalStudyTimeHours}</span>
                                <span className={styles.statUnit}>時間</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Recommended */}
                    <div className={styles.recommendedSection}>
                        <div className={styles.recommendedHeader}>
                            <h3 className={styles.recommendedTitle}>あなたへのおすすめ問題</h3>
                            <p className={styles.recommendedSubtitle}>過去の解答傾向から、今取り組むべき問題を作成します。</p>
                        </div>
                        <div className={styles.recommendedCardsRow}>
                            {/* Dynamic Mini Cards from History */}
                            {history.length > 0 ? (
                                history.slice(0, 3).map((h, idx) => {
                                    const daysDiff = Math.floor((Date.now() - new Date(h.createdAt).getTime()) / (1000 * 3600 * 24));
                                    const timeAgo = daysDiff === 0 ? '今日' : `${daysDiff}日前`;

                                    return (
                                        <div key={idx} className={styles.miniCard} onClick={() => router.push(`/history/${h.id}`)} style={{ cursor: 'pointer' }}>
                                            <div className={styles.miniTopRow}>
                                                <span className={styles.miniBadge} style={{
                                                    borderColor: h.subject === '数I' ? '#5aa9fa' : h.subject === '数A' ? '#a56eff' : '#2bcbcb',
                                                    color: h.subject === '数I' ? '#5aa9fa' : h.subject === '数A' ? '#a56eff' : '#2bcbcb'
                                                }}>
                                                    {h.subject}
                                                </span>
                                                <span className={styles.miniTime}>{timeAgo}</span>
                                            </div>
                                            <div className={styles.miniMeta}>{h.unit}</div>
                                            <div className={styles.miniTitle}>{h.problemTitle}</div>
                                            <div className={styles.miniLink}>詳細を見る</div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: '#999', fontSize: '14px', padding: '20px' }}>
                                    おすすめ問題を作成中...<br />
                                    (解答履歴がありません)
                                </div>
                            )}
                        </div>
                        <button className={styles.recommendBtn} onClick={() => router.push('/recommend')}>おすすめ問題を解く</button>
                    </div>
                </div>

                {/* 1. Subject Choice */}
                <h2 className={styles.sectionTitle}>教科から選ぶ</h2>
                <div className={styles.gridContainer}>
                    {subjectProblems.map((p, i) => (
                        <DashboardProbCard
                            key={i}
                            title={p.title}
                            subject={p.subject || '数学'}
                            unit={p.unit || '単元'}
                            badgeClass={getBadgeClass(p.subject)}
                            onClick={() => router.push(`/solve/${p.id}`)}
                        />
                    ))}
                </div>

                {/* 2. Level Choice */}
                <h2 className={styles.sectionTitle}>レベル別問題</h2>
                <div className={styles.gridContainer}>
                    {/* Mocking Levels visually using same problems but different badges if needed, or just standard */}
                    {levelProblems.map((p, i) => (
                        <DashboardProbCard
                            key={i}
                            title={p.title}
                            subject={`Lv.${(i % 3) + 1}`} // Mock level label
                            unit={p.subject} // Show subject as unit here
                            badgeClass={styles.badgeLv3} // Use purple/blue style
                            onClick={() => router.push(`/solve/${p.id}`)}
                            buttonText="問題を解く"
                        />
                    ))}
                </div>

                {/* 3. Weakness Overcoming */}
                <h2 className={styles.sectionTitle}>苦手克服</h2>
                <div className={styles.gridContainer}>
                    {weaknessProblems.sort((a, b) => (a.avgSuccessRate || 0) - (b.avgSuccessRate || 0)).map((p, i) => (
                        <DashboardProbCard
                            key={i}
                            title={p.title}
                            subject={`正答率 ${p.avgSuccessRate}%`} // Display Success Rate
                            unit={p.unit}
                            badgeClass={styles.badgeMathB} // Use orange/warning color for weakness
                            onClick={() => router.push(`/solve/${p.id}`)}
                            buttonText="問題を解く"
                        />
                    ))}
                </div>

                {/* 4. Random Problems */}
                <h2 className={styles.sectionTitle}>ランダム問題</h2>
                <div className={styles.randomBanner}>
                    <p className={styles.randomText}>
                        あなたのこれまでのデータを元に、AIが今のあなたに適した問題を生成します。
                    </p>
                    <button className={styles.randomBtn} onClick={() => router.push('/random')}>
                        問題を生成して解く
                    </button>
                </div>

                {/* 5. History */}
                <h2 className={styles.sectionTitle}>最近の解答履歴</h2>
                <div className={styles.gridContainer}>
                    {history && history.length > 0 ? history.map((h, i) => (
                        <DashboardProbCard
                            key={i}
                            title={h.problemTitle}
                            subject={h.subject || '数学'}
                            unit={`${new Date(h.createdAt).getMonth() + 1}月${new Date(h.createdAt).getDay()}日`} // Mock date
                            badgeClass={getBadgeClass(h.subject)}
                            onClick={() => router.push(`/history/${h.id}`)}
                            isHistory
                        />
                    )) : (
                        <div className={styles.emptyHistory} style={{ gridColumn: '1 / -1' }}>
                            解答履歴はありません。
                        </div>
                    )}
                </div>

            </main>
            <Footer />
        </div>
    );
}
