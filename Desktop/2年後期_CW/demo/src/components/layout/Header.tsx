import Link from 'next/link';
import styles from './layout.module.css';

export default function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.headerContainer}>
                <Link href="/dashboard" className={styles.logo} style={{ textDecoration: 'none' }}>
                    <span style={{ color: '#2b3b4c' }}>RE</span>
                    <span className={styles.logoColon}>:</span>
                    <span style={{ color: '#2b3b4c' }}>KAI</span>
                </Link>
                <nav className={styles.nav}>
                    <Link href="/references" className={styles.navLink}>参考書</Link>
                    <Link href="/history" className={styles.navLink}>解答履歴</Link>
                    <Link href="/settings" className={styles.navLink}>設定</Link>
                </nav>
            </div>
        </header>
    );
}
