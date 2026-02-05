'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';

export default function PrivacyPage() {
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

                <div className={styles.heroCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 10px 0' }}>プライバシーポリシー</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>個人情報の取り扱いについて</p>
                    </div>

                    <div style={{ maxWidth: '800px', margin: '0 auto', fontSize: '15px', lineHeight: '1.8', color: '#333' }}>

                        <p style={{ marginBottom: '20px' }}>
                            本サービス運営者（以下，「運営者」といいます。）は，本ウェブサイト上で提供するサービス（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
                        </p>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第1条（個人情報）
                            </h2>
                            <p>「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報（個人識別情報）を指します。</p>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第2条（個人情報の収集方法）
                            </h2>
                            <p>運営者は，ユーザーが利用登録をする際に氏名，メールアドレスなどの個人情報をお尋ねすることがあります。また，ユーザーの学習履歴や成績データなどの情報を収集します。</p>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第3条（個人情報を収集・利用する目的）
                            </h2>
                            <p>運営者が個人情報を収集・利用する目的は，以下のとおりです。</p>
                            <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
                                <li>本サービスの提供・運営のため</li>
                                <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
                                <li>ユーザーが利用中のサービスの新機能，更新情報，キャンペーン等及び運営者が提供する他のサービスの案内のメールを送付するため</li>
                                <li>メンテナンス，重要なお知らせなど必要に応じたご連絡のため</li>
                                <li>利用規約に違反したユーザーや，不正・不当な目的でサービスを利用しようとするユーザーの特定をし，ご利用をお断りするため</li>
                            </ol>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第4条（利用目的の変更）
                            </h2>
                            <p>運営者は，利用目的が変更前と関連性を有すると合理的に認められる場合に限り，個人情報の利用目的を変更するものとします。</p>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第5条（個人情報の第三者提供）
                            </h2>
                            <ol style={{ paddingLeft: '20px' }}>
                                <li>運営者は，次に掲げる場合を除いて，あらかじめユーザーの同意を得ることなく，第三者に個人情報を提供することはありません。ただし，個人情報保護法その他の法令で認められる場合を除きます。
                                    <ul style={{ marginTop: '10px' }}>
                                        <li>人の生命，身体または財産の保護のために必要がある場合であって，本人の同意を得ることが困難であるとき</li>
                                        <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって，本人の同意を得ることが困難であるとき</li>
                                        <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって，本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                                    </ul>
                                </li>
                            </ol>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第6条（個人情報の安全管理）
                            </h2>
                            <p>運営者は，個人情報の紛失，破壊，改ざん及び漏洩などのリスクに対して，個人情報の安全管理が図られるよう，適切な措置を講じます。</p>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第7条（お問い合わせ窓口）
                            </h2>
                            <p>本ポリシーに関するお問い合わせは，お問い合わせフォームよりお願いいたします。</p>
                        </section>

                        <div style={{ marginTop: '50px', textAlign: 'center' }}>
                            <Link href="/" className={styles.recommendBtn} style={{ textDecoration: 'none', display: 'inline-block', lineHeight: '44px', padding: '0 30px' }}>
                                ホームに戻る
                            </Link>
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
