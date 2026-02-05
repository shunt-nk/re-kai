import { kv } from '@vercel/kv';
import { User } from '@/data/mockData';
import { v4 as uuidv4 } from 'uuid';

// Extended User Interface for DB
export interface DBUser extends User {
    password?: string;
    email?: string;
    createdAt: string;
}

export interface HistoryRecord {
    id: string;
    userId: string;
    problemId: string;
    problemTitle: string;
    subject: string;
    unit: string;
    score: number;
    answers: Record<string, string>;
    isCorrect: boolean;
    timeSpentSec: number;
    aiFeedback: string;
    imageBase64: string | null;
    createdAt: string;
}

// クラウド(KV)からユーザーリストを取得する関数
async function readDb(): Promise<DBUser[]> {
    const users = await kv.get<DBUser[]>('users');
    return users || [];
}

// クラウド(KV)にユーザーリストを保存する関数
async function writeDb(users: DBUser[]) {
    await kv.set('users', users);
}

// クラウド(KV)から履歴を取得する関数
async function readHistoryDb(): Promise<HistoryRecord[]> {
    const records = await kv.get<HistoryRecord[]>('history');
    return records || [];
}

// クラウド(KV)に履歴を保存する関数
async function writeHistoryDb(records: HistoryRecord[]) {
    await kv.set('history', records);
}

export const db = {
    // 【重要】すべて async (非同期) になります
    getUsers: async () => await readDb(),

    getUserById: async (id: string) => {
        const users = await readDb();
        return users.find(u => u.id === id);
    },

    saveUser: async (user: DBUser) => {
        const users = await readDb();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) {
            users[idx] = user;
        } else {
            users.push(user);
        }
        await writeDb(users);
        return user;
    },

    updateUserStats: async (id: string, updates: Partial<DBUser>) => {
        const users = await readDb();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return null;

        const updatedUser = { ...users[idx], ...updates };
        users[idx] = updatedUser;
        await writeDb(users);
        return updatedUser;
    },

    getExrichedUser: async (id: string) => {
        const users = await readDb();
        const allRecords = await readHistoryDb();
        const records = allRecords.filter(r => r.userId === id);

        const totalQuestions = records.length;
        const totalTimeSec = records.reduce((acc, r) => acc + (r.timeSpentSec || 0), 0);
        const totalStudyTimeHours = Math.round((totalTimeSec / 3600) * 10) / 10;

        const sorted = [...users].sort((a, b) => {
            if (a.level !== b.level) return b.level - a.level;
            return b.currentExp - a.currentExp;
        });

        const rank = sorted.findIndex(u => u.id === id) + 1;
        const user = sorted.find(u => u.id === id);

        if (!user) return null;

        return {
            ...user,
            ranking: rank,
            totalQuestions,
            totalStudyTimeHours
        };
    },

    // History Methods
    saveHistory: async (record: Omit<HistoryRecord, 'id' | 'createdAt'>) => {
        const records = await readHistoryDb();
        const newRecord: HistoryRecord = {
            ...record,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        };
        records.push(newRecord);
        await writeHistoryDb(records);
        return newRecord;
    },

    getHistoryByUserId: async (userId: string) => {
        const records = await readHistoryDb();
        return records.filter(r => r.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    getHistoryById: async (id: string) => {
        const records = await readHistoryDb();
        return records.find(r => r.id === id);
    }
};