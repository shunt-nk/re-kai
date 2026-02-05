'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import styles from '../dashboard/dashboard.module.css';

export default function TermsPage() {
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
                        <h1 className={styles.sectionTitle} style={{ margin: '0 0 10px 0' }}>利用規約</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>本サービスの利用条件を定めるものです。</p>
                    </div>

                    <div style={{ maxWidth: '800px', margin: '0 auto', fontSize: '15px', lineHeight: '1.8', color: '#333' }}>

                        <p style={{ marginBottom: '20px' }}>
                            この利用規約（以下，「本規約」といいます。）は，本サービス提供者（以下，「運営者」といいます。）がこのウェブサイト上で提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆さま（以下，「ユーザー」といいます。）には，本規約に従って，本サービスをご利用いただきます。
                        </p>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第1条（適用）
                            </h2>
                            <ol style={{ paddingLeft: '20px' }}>
                                <li>本規約は，ユーザーと運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。</li>
                                <li>運営者は本サービスに関し，本規約のほか，ご利用にあたってのルール等，各種の定め（以下，「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず，本規約の一部を構成するものとします。</li>
                            </ol>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第2条（利用登録）
                            </h2>
                            <ol style={{ paddingLeft: '20px' }}>
                                <li>本サービスにおいては，登録希望者が本規約に同意の上，運営者の定める方法によって利用登録を申請し，運営者がこれを承認することによって，利用登録が完了するものとします。</li>
                                <li>運営者は，利用登録の申請者に以下の事由があると判断した場合，利用登録の申請を承認しないことがあり，その理由については一切の開示義務を負わないものとします。
                                    <ul style={{ marginTop: '10px' }}>
                                        <li>虚偽の事項を届け出た場合</li>
                                        <li>本規約に違反したことがある者からの申請である場合</li>
                                        <li>その他，運営者が利用登録を相当でないと判断した場合</li>
                                    </ul>
                                </li>
                            </ol>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第3条（ユーザーIDおよびパスワードの管理）
                            </h2>
                            <ol style={{ paddingLeft: '20px' }}>
                                <li>ユーザーは，自己の責任において，本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</li>
                                <li>ユーザーは，いかなる場合にも，ユーザーIDおよびパスワードを第三者に譲渡または貸与し，もしくは第三者と共用することはできません。</li>
                            </ol>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第4条（禁止事項）
                            </h2>
                            <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
                            <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
                                <li>法令または公序良俗に違反する行為</li>
                                <li>犯罪行為に関連する行為</li>
                                <li>本サービスの内容等，本サービスに含まれる著作権，商標権ほか知的財産権を侵害する行為</li>
                                <li>運営者，ほかのユーザー，またはその他第三者のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
                                <li>本サービスの運営を妨害するおそれのある行為</li>
                                <li>不正アクセスをし，またはこれを試みる行為</li>
                                <li>他のユーザーに成りすます行為</li>
                                <li>本サービスの他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                            </ul>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第5条（免責事項）
                            </h2>
                            <ol style={{ paddingLeft: '20px' }}>
                                <li>運営者は，本サービスに事実上または法律上の瑕疵（安全性，信頼性，正確性，完全性，有効性，特定の目的への適合性，セキュリティなどに関する欠陥，エラーやバグ，権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
                                <li>本サービスは学習支援を目的としていますが，学力向上や試験合格を保証するものではありません。</li>
                                <li>運営者は，本サービスに関して，ユーザーと他のユーザーまたは第三者との間において生じた取引，連絡または紛争等について一切責任を負いません。</li>
                            </ol>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第6条（サービス内容の変更等）
                            </h2>
                            <p>運営者は，ユーザーに通知することなく，本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし，これによってユーザーに生じた損害について一切の責任を負いません。</p>
                        </section>

                        <section style={{ marginBottom: '30px' }}>
                            <h2 style={{ fontSize: '18px', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '15px', fontWeight: 'bold' }}>
                                第7条（利用規約の変更）
                            </h2>
                            <p>運営者は，必要と判断した場合には，ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお，本規約の変更後，本サービスの利用を開始した場合には，当該ユーザーは変更後の規約に同意したものとみなします。</p>
                        </section>

                        <div style={{ marginTop: '50px', textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', color: '#999' }}>以上</p>
                            <div style={{ marginTop: '20px' }}>
                                <Link href="/" className={styles.recommendBtn} style={{ textDecoration: 'none', display: 'inline-block', lineHeight: '44px', padding: '0 30px' }}>
                                    同意してホームに戻る
                                </Link>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
