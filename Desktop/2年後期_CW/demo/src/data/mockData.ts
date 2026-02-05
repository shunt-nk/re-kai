// Data Models
export interface User {
    id: string;
    name: string;
    level: number;
    currentExp: number;
    maxExp: number;
    ranking: number;
    totalQuestions: number;
    totalStudyTimeHours: number;
}

export interface Problem {
    id: string;
    title: string;
    text: string;
    timeLimit: number; // Seconds
    questions: SubQuestion[]; // Assuming Question is SubQuestion based on existing data
    subject: string;
    unit: string;
    avgSuccessRate?: number; // Added for Weakness section
    difficultyLevel?: number; // Added to suppress lints
}

export interface RecommendedProblem {
    id: string;
    subject: string;
    timeAgo: string; // e.g. "1日前"
    unit: string;
    title: string;
}

export interface SubQuestion {
    id: string;
    label: string;
    correctAnswer: string;
}

export interface Unit {
    id: string;
    title: string;
    subject: '数学' | '物理' | '化学' | '英語' | '社会' | '日本史' | '世界史';
    courseCategory?: 'math1' | 'mathA' | 'math2' | 'mathB' | 'science' | 'jp_history' | 'world_history';
    color: string;
}

export interface Course {
    id: string;
    title: string;
    subject: '数学' | '物理' | '化学' | '英語' | '社会' | '日本史' | '世界史';
    description: string;
    color: string;
}

export const CURRENT_USER: User = {
    id: 'u1',
    name: '中平 隼太',
    level: 10,
    currentExp: 450,
    maxExp: 1000,
    ranking: 10000,
    totalQuestions: 100,
    totalStudyTimeHours: 10
};

export const RECOMMENDED_PROBLEMS: RecommendedProblem[] = [
    { id: 'rec1', subject: '数I', timeAgo: '1日前', unit: '数と式', title: '因数分解（基礎）' },
    { id: 'rec2', subject: '数A', timeAgo: '2日前', unit: '場合の数', title: '順列' },
    { id: 'rec3', subject: '数II', timeAgo: '3日前', unit: '式と証明', title: '証明' },
];

export const HISTORY_PROBLEMS: RecommendedProblem[] = [
    { id: 'hist1', subject: '数I', timeAgo: '1日前', unit: '数と式', title: '因数分解（基礎）' },
    { id: 'hist2', subject: '数A', timeAgo: '2日前', unit: '場合の数', title: '順列' },
    { id: 'hist3', subject: '数II', timeAgo: '3日前', unit: '式と証明', title: '証明' },
    { id: 'hist4', subject: '数II', timeAgo: '3日前', unit: '式と証明', title: '証明' },
];

// Course Categories (Displayed on Home)
export const COURSES: Course[] = [
    { id: 'math', title: '数学', subject: '数学', description: '数I・A・II・B 完全対応', color: '#58cc02' },
    // { id: 'science', title: '理科', subject: '物理', description: '物理・化学', color: '#ce82ff' }, // Placeholder for now
];

// Subject Categories for Selection (Math + New Subjects)
export const SUBJECT_SELECTIONS = [
    { id: 'math1', title: '数学I', color: '#58cc02' },
    { id: 'mathA', title: '数学A', color: '#2b70c9' },
    { id: 'math2', title: '数学II', color: '#ff9600' },
    { id: 'mathB', title: '数学B', color: '#ce82ff' },
    { id: 'science', title: '科学', color: '#00cec9' },
    { id: 'jp_history', title: '日本史', color: '#d63031' },
    { id: 'world_history', title: '世界史', color: '#e17055' },
];

export const MATH_SUBJECTS = SUBJECT_SELECTIONS; // Alias for backward compatibility if needed

export const UNITS: Unit[] = [
    // --- Math I ---
    { id: 'u_m1_1', title: '数と式', subject: '数学', courseCategory: 'math1', color: '#58cc02' },
    { id: 'u_m1_2', title: '集合と命題', subject: '数学', courseCategory: 'math1', color: '#58cc02' },
    { id: 'u_m1_3', title: '2次関数', subject: '数学', courseCategory: 'math1', color: '#58cc02' },

    // --- Math A ---
    { id: 'u_mA_1', title: '場合の数', subject: '数学', courseCategory: 'mathA', color: '#2b70c9' },
    { id: 'u_mA_2', title: '確率', subject: '数学', courseCategory: 'mathA', color: '#2b70c9' },
    { id: 'u_mA_3', title: '図形の性質', subject: '数学', courseCategory: 'mathA', color: '#2b70c9' },

    // --- Math II ---
    { id: 'u_m2_1', title: '式と証明', subject: '数学', courseCategory: 'math2', color: '#ff9600' },
    { id: 'u_m2_2', title: '図形と方程式', subject: '数学', courseCategory: 'math2', color: '#ff9600' },
    { id: 'u_m2_3', title: '三角関数', subject: '数学', courseCategory: 'math2', color: '#ff9600' },

    // --- Math B ---
    { id: 'u_mB_1', title: '数列', subject: '数学', courseCategory: 'mathB', color: '#ce82ff' },
    { id: 'u_mB_2', title: 'ベクトル', subject: '数学', courseCategory: 'mathB', color: '#ce82ff' },
    { id: 'u_mB_3', title: '統計的な推測', subject: '数学', courseCategory: 'mathB', color: '#ce82ff' },

    // --- Science ---
    { id: 'u_sci_1', title: '力学', subject: '物理', courseCategory: 'science', color: '#00cec9' },
    { id: 'u_sci_2', title: '化学結合', subject: '化学', courseCategory: 'science', color: '#00cec9' },

    // --- JP History ---
    { id: 'u_jp_1', title: '鎌倉時代', subject: '社会', courseCategory: 'jp_history', color: '#d63031' },
    { id: 'u_jp_2', title: '江戸時代', subject: '社会', courseCategory: 'jp_history', color: '#d63031' },

    // --- World History ---
    { id: 'u_wh_1', title: 'ルネサンス', subject: '社会', courseCategory: 'world_history', color: '#e17055' },
    { id: 'u_wh_2', title: '産業革命', subject: '社会', courseCategory: 'world_history', color: '#e17055' },
];

export const PROBLEMS: Problem[] = [
    // ================= Math I =================
    // 数と式 (Already exists)
    {
        id: 'p_m1_1_1',
        title: '因数分解（基礎）',
        subject: '数学I', // Consistency check: logic uses 'title' from SUBJECT_SELECTIONS. Math I title is '数学I'
        unit: '数と式',
        text: '次の式を因数分解せよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '$$x^2 - 4$$', correctAnswer: '(x+2)(x-2)' },
            { id: 'q2', label: '$$3x^2 + 7x + 2$$', correctAnswer: '(3x+1)(x+2)' },
            { id: 'q3', label: '$$x^2 + 6x + 9$$', correctAnswer: '(x+3)^2' }
        ]
    },
    // 集合と命題 (New)
    {
        id: 'p_m1_2_1',
        title: '集合の要素',
        subject: '数学I',
        unit: '集合と命題',
        text: '次の集合A, Bについて、A ∩ B を求めよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: 'A={1,2,3,4}, B={3,4,5,6}', correctAnswer: '{3,4}' },
            { id: 'q2', label: 'A={x|xは12の正の約数}, B={x|xは18の正の約数}', correctAnswer: '{1,2,3,6}' },
            { id: 'q3', label: 'A={1,3,5}, B={2,4,6}', correctAnswer: '∅' }
        ]
    },
    // 2次関数 (Existing but updated subject name potentially? Check logic. Logic matches p.subject === selectedSubject.title. Selected subject title is '数学I')
    // Wait, original data had subject: '数I'. SUBJECT_SELECTIONS has '数学I'. 
    // I MUST UPDATE EXISTING PROBLEMS TO MATCH SELECTION TITLES: '数学I', '数学A', '数学II', '数学B'.
    // Or I should update SUBJECT_SELECTIONS to match existing data '数I' etc.
    // Existing data used '数I', '数A', '数II', '数B'.
    // I will use those in SUBJECT_SELECTIONS to avoid breaking huge things, or update all problems.
    // Let's update SUBJECT_SELECTIONS to show '数学I' but use ID or map?
    // RandomPage logic: candidates.filter(p => p.subject === selectedSubject); (selectedSubject is title)
    // So '数学I' !== '数I'.
    // I will update the Problems to use the full names '数学I' etc., and update the existing ones.

    // ... Actually, the previous 'Math I' problems had subject '数I'. 
    // I will standardize on the shorter names for Subject if that's what was used, OR update existing.
    // Let's update existing to '数学I' etc. for consistency with the button titles.

    // ... WAIT. The buttons in RandomPage use `sub.title`.
    // SUBJECT_SELECTIONS has `{ title: '数学I' }`.
    // So p.subject must be '数学I'.

    // Ref: Existing mockData had: { id: 'math1', title: '数学I' ... } but `PROBLEMS` had `subject: '数I'`.
    // This implies `RandomPage` logic `p.subject === selectedSubject` would FAIL for existing data if `selectedSubject` comes from `sub.title`.
    // Let's check `RandomPage` again. `setSelectedSubject(sub.title)`.
    // So yes, it was broken or relying on `math1` title being `数I'? 
    // Checking `MATH_SUBJECTS` in previous Step 135: `{ id: 'math1', title: '数学I', ... }`
    // Checking `PROBLEMS` in previous Step 135: `subject: '数I'`.
    // '数学I' !== '数I'. So Random generation for Math I currently fails? 
    // Ah, likely `selectedSubject` was never set to '数I'.
    // I will fix this by setting problem subjects to match the Selection Titles (e.g. '数学I').

    // 2次関数 (Updated subject)
    {
        id: 'p_m1_3_1',
        title: '頂点の座標',
        subject: '数学I',
        unit: '2次関数',
        text: '次の2次関数のグラフの頂点の座標を求めよ。',
        difficultyLevel: 2, timeLimit: 200, avgSuccessRate: 80,
        questions: [
            { id: 'q1', label: '$$y = x^2 - 4x + 1$$', correctAnswer: '(2, -3)' },
            { id: 'q2', label: '$$y = 2x^2 + 8x + 5$$', correctAnswer: '(-2, -3)' },
            { id: 'q3', label: '$$y = -x^2 + 6x - 2$$', correctAnswer: '(3, 7)' }
        ]
    },

    // ================= Math A =================
    // 場合の数 (Updated subject)
    {
        id: 'p_mA_1_1',
        title: '順列',
        subject: '数学A',
        unit: '場合の数',
        text: '次の順列の総数を求めよ。',
        difficultyLevel: 2, timeLimit: 150, avgSuccessRate: 60,
        questions: [
            { id: 'q1', label: '5人の生徒から3人を選んで並べる', correctAnswer: '60' },
            { id: 'q2', label: '6人の生徒から2人を選んで並べる', correctAnswer: '30' },
            { id: 'q3', label: '7人の生徒から7人全員を並べる', correctAnswer: '5040' }
        ]
    },
    // 確率 (New)
    {
        id: 'p_mA_2_1',
        title: '確率の基本',
        subject: '数学A',
        unit: '確率',
        text: '次の確率を求めよ。',
        timeLimit: 150,
        questions: [
            { id: 'q1', label: 'サイコロを1回振って偶数が出る確率', correctAnswer: '1/2' },
            { id: 'q2', label: 'コインを2回投げて2回とも表が出る確率', correctAnswer: '1/4' },
            { id: 'q3', label: '赤玉3個、白玉2個の入った袋から1個を取り出すとき、赤玉である確率', correctAnswer: '3/5' }
        ]
    },
    // 図形の性質 (New)
    {
        id: 'p_mA_3_1',
        title: '三角形の性質',
        subject: '数学A',
        unit: '図形の性質',
        text: '三角形ABCにおいて、次の値を求めよ。',
        timeLimit: 180,
        questions: [
            { id: 'q1', label: '重心は中線を何対何に内分するか', correctAnswer: '2:1' },
            { id: 'q2', label: '外心は三角形の何の中心か', correctAnswer: '外接円' },
            { id: 'q3', label: '内心は三角形の何の中心か', correctAnswer: '内接円' }
        ]
    },

    // ================= Math II =================
    // 式と証明 (New)
    {
        id: 'p_m2_1_1',
        title: '恒等式',
        subject: '数学II',
        unit: '式と証明',
        text: '次の等式がxについての恒等式となるように、定数a, bの値を定めよ。',
        timeLimit: 150,
        questions: [
            { id: 'q1', label: '$$x^2 + ax + b = (x+1)^2$$', correctAnswer: 'a=2, b=1' },
            { id: 'q2', label: '$$a(x+1) + b(x-1) = 2x$$', correctAnswer: 'a=1, b=1' },
            { id: 'q3', label: '$$x^3 = (x-1)^3 + ax^2 + bx + 1$$', correctAnswer: 'a=3, b=-3' }
        ]
    },
    // 図形と方程式 (New)
    {
        id: 'p_m2_2_1',
        title: '円の方程式',
        subject: '数学II',
        unit: '図形と方程式',
        text: '次の円の方程式を求めよ。',
        timeLimit: 180,
        questions: [
            { id: 'q1', label: '中心(0,0), 半径3', correctAnswer: 'x^2+y^2=9' },
            { id: 'q2', label: '中心(1, -2), 半径2', correctAnswer: '(x-1)^2+(y+2)^2=4' },
            { id: 'q3', label: '原点を中心とし、点(3,4)を通る', correctAnswer: 'x^2+y^2=25' }
        ]
    },
    // 三角関数 (Updated subject)
    {
        id: 'p_m2_3_1',
        title: '三角比',
        subject: '数学II',
        unit: '三角関数',
        text: '次の三角比の値を求めよ。',
        difficultyLevel: 2, timeLimit: 60, avgSuccessRate: 85,
        questions: [
            { id: 'q1', label: '$$\\sin 120^\\circ$$', correctAnswer: 'sqrt(3)/2' },
            { id: 'q2', label: '$$\\cos 135^\\circ$$', correctAnswer: '-1/sqrt(2)' },
            { id: 'q3', label: '$$\\tan 150^\\circ$$', correctAnswer: '-1/sqrt(3)' }
        ]
    },

    // ================= Math B =================
    // 数列 (Updated subject)
    {
        id: 'p_mB_1_1',
        title: '等差数列',
        subject: '数学B',
        unit: '数列',
        text: '以下の条件を満たす等差数列の第10項を求めよ。',
        difficultyLevel: 1, timeLimit: 60, avgSuccessRate: 95,
        questions: [
            { id: 'q1', label: '初項 3, 公差 2', correctAnswer: '21' },
            { id: 'q2', label: '初項 5, 公差 3', correctAnswer: '32' },
            { id: 'q3', label: '初項 10, 公差 -2', correctAnswer: '-8' }
        ]
    },
    // ベクトル (New)
    {
        id: 'p_mB_2_1',
        title: 'ベクトルの演算',
        subject: '数学B',
        unit: 'ベクトル',
        text: '次の計算をせよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '$$\\vec{a} = (1, 2), \\vec{b} = (3, 1)$$ のとき $$\\vec{a} + \\vec{b}$$', correctAnswer: '(4, 3)' },
            { id: 'q2', label: '$$\\vec{a} = (2, -1), \\vec{b} = (-1, 4)$$ のとき $$2\\vec{a} - \\vec{b}$$', correctAnswer: '(5, -6)' },
            { id: 'q3', label: '$$\\vec{a} = (3, 4)$$ の大きさ $$|\\vec{a}|$$', correctAnswer: '5' }
        ]
    },
    // 統計 (New)
    {
        id: 'p_mB_3_1',
        title: '代表値',
        subject: '数学B',
        unit: '統計的な推測',
        text: '次のデータの平均値を求めよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '3, 5, 7, 9, 11', correctAnswer: '7' },
            { id: 'q2', label: '2, 4, 6, 8, 10', correctAnswer: '6' },
            { id: 'q3', label: '10, 20, 30', correctAnswer: '20' }
        ]
    },

    // ================= Science =================
    {
        id: 'p_sci_1',
        title: '速度と加速度',
        subject: '科学',
        unit: '力学',
        text: '次の問いに答えよ。',
        timeLimit: 150,
        questions: [
            { id: 'q1', label: '初速度0m/sで等加速度運動を始め、2秒後の速度が10m/sのときの加速度(m/s^2)', correctAnswer: '5' },
            { id: 'q2', label: '一定の速さ36km/hは何m/sか', correctAnswer: '10' },
            { id: 'q3', label: '自由落下する物体のt秒後の速度vを表す式 (g=重力加速度)', correctAnswer: 'gt' }
        ]
    },
    {
        id: 'p_sci_2',
        title: '化学結合',
        subject: '科学',
        unit: '化学結合',
        text: '次の物質の化学結合の種類を答えよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: 'NaCl', correctAnswer: 'イオン結合' },
            { id: 'q2', label: 'H2O', correctAnswer: '共有結合' },
            { id: 'q3', label: 'Fe', correctAnswer: '金属結合' }
        ]
    },

    // ================= JP History =================
    {
        id: 'p_jp_1',
        title: '鎌倉幕府',
        subject: '日本史',
        unit: '鎌倉時代',
        text: '次の問いに答えよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '鎌倉幕府を開いた人物', correctAnswer: '源頼朝' },
            { id: 'q2', label: '1221年に後鳥羽上皇が起こした乱', correctAnswer: '承久の乱' },
            { id: 'q3', label: '鎌倉幕府の執権として権力を振るった氏族', correctAnswer: '北条氏' }
        ]
    },
    {
        id: 'p_jp_2',
        title: '江戸の文化',
        subject: '日本史',
        unit: '江戸時代',
        text: '次の問いに答えよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '「奥の細道」を著した俳人', correctAnswer: '松尾芭蕉' },
            { id: 'q2', label: '人形浄瑠璃の脚本を多く書いた人物', correctAnswer: '近松門左衛門' },
            { id: 'q3', label: '浮世絵「富嶽三十六景」の作者', correctAnswer: '葛飾北斎' }
        ]
    },

    // ================= World History =================
    {
        id: 'p_wh_1',
        title: 'ルネサンス',
        subject: '世界史',
        unit: 'ルネサンス',
        text: '次の問いに答えよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '「モナ・リザ」を描いた人物', correctAnswer: 'レオナルド・ダ・ヴィンチ' },
            { id: 'q2', label: '「神曲」を著したイタリアの詩人', correctAnswer: 'ダンテ' },
            { id: 'q3', label: '地動説を唱えたポーランドの天文学者', correctAnswer: 'コペルニクス' }
        ]
    },
    {
        id: 'p_wh_2',
        title: '産業革命',
        subject: '世界史',
        unit: '産業革命',
        text: '次の問いに答えよ。',
        timeLimit: 120,
        questions: [
            { id: 'q1', label: '産業革命が最初に始まった国', correctAnswer: 'イギリス' },
            { id: 'q2', label: '蒸気機関を改良した人物', correctAnswer: 'ワット' },
            { id: 'q3', label: '蒸気機関車を発明した人物', correctAnswer: 'スチーブンソン' }
        ]
    }
];

export const getUnitProblems = (unitId: string) => {
    const unit = UNITS.find(u => u.id === unitId);
    if (!unit) return [];
    return PROBLEMS.filter(p => p.unit === unit.title);
};

export const REFERENCES_DATA = [
    {
        subject: '数I',
        color: '#58cc02',
        units: [
            {
                unit: '数と式',
                topics: [
                    { title: '因数分解の公式', content: '1. $$x^2 + (a+b)x + ab = (x+a)(x+b)$$\n2. $$a^2 - b^2 = (a+b)(a-b)$$\n3. $$x^3 + y^3 = (x+y)(x^2-xy+y^2)$$' },
                    { title: '絶対値', content: '$$|x|$$ は $x \\geqq 0$ のとき $x$、$x < 0$ のとき $-x$ となる。' }
                ]
            },
            {
                unit: '2次関数',
                topics: [
                    { title: '頂点の座標', content: '$$y = a(x-p)^2 + q$$ の頂点は $$(p, q)$$\n基本形 $$y = ax^2 + bx + c$$ は平方完成して変形する。' },
                    { title: '判別式', content: '$$D = b^2 - 4ac$$\n$D > 0$: 異なる2つの実数解\n$D = 0$: 重解\n$D < 0$: 実数解なし' }
                ]
            }
        ]
    },
    {
        subject: '数A',
        color: '#2b70c9',
        units: [
            {
                unit: '場合の数',
                topics: [
                    { title: '順列と組み合わせ', content: '順列 $$_nP_r = \\frac{n!}{(n-r)!}$$\n組み合わせ $$_nC_r = \\frac{n!}{r!(n-r)!}$$' },
                    { title: '円順列', content: '異なるn個のものの円順列の総数は $$(n-1)!$$ 通り' }
                ]
            }
        ]
    },
    {
        subject: '数II',
        color: '#ff9600',
        units: [
            {
                unit: '三角関数',
                topics: [
                    { title: '三角関数の相互関係', content: '1. $$\\sin^2\\theta + \\cos^2\\theta = 1$$\n2. $$\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$$\n3. $$1 + \\tan^2\\theta = \\frac{1}{\\cos^2\\theta}$$' },
                    { title: '加法定理', content: '$$\\sin(\\alpha+\\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta$$\n$$\\cos(\\alpha+\\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta$$' }
                ]
            }
        ]
    },
    {
        subject: '数B',
        color: '#ce82ff',
        units: [
            {
                unit: '数列',
                topics: [
                    { title: '等差数列', content: '一般項: $$a_n = a + (n-1)d$$\n和: $$S_n = \\frac{1}{2}n(a+l)$$' },
                    { title: '等比数列', content: '一般項: $$a_n = ar^{n-1}$$\n和: $$S_n = \\frac{a(1-r^n)}{1-r}$$' }
                ]
            }
        ]
    },
    {
        subject: '科学',
        color: '#00cec9',
        units: [
            {
                unit: '力学',
                topics: [
                    { title: '等加速度直線運動', content: '1. $$v = v_0 + at$$\n2. $$x = v_0t + \\frac{1}{2}at^2$$\n3. $$v^2 - v_0^2 = 2ax$$' },
                    { title: '運動方程式', content: '$$F = ma$$\n($F$:力, $m$:質量, $a$:加速度)' }
                ]
            }
        ]
    }
];

