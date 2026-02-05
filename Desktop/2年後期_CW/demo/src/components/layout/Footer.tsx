import Link from 'next/link';
import styles from './layout.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.footerLinks}>
                <Link href="/terms" className={styles.footerLink}>利用規約</Link>
                <Link href="/privacy" className={styles.footerLink}>プライバシーポリシー</Link>
                <Link href="/contact" className={styles.footerLink}>お問い合わせ</Link>
                <Link href="/about" className={styles.footerLink}>RE:KAIについて</Link>
            </div>
        </footer>
    );
}
