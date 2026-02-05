import Redis from 'ioredis';
import { User } from '@/data/mockData';
import { v4 as uuidv4 } from 'uuid';

// 環境変数 REDIS_URL を使って接続します
const getClient = () => {
    const url = process.env.REDIS_URL;
    if (!url) {
        throw new Error("REDIS_URL is not defined");
    }
    return new Redis(url);
};

// Extended User Interface
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

// データを取得するヘルパー関数
async function getData<T>(key: string): Promise<T | null> {
    const redis = getClient();
    try {
        const data = await redis.get(key);
        if (!data) return null;
        return JSON.parse(data) as T;
    } finally {
        redis.quit(); // 接続を閉じる
    }
}

// データを保存するヘルパー関数
async function setData(key: string, value: any) {
    const redis = getClient();
    try {
        await redis.set(key, JSON.stringify(value));
    } finally {
        redis.quit();
    }
}

// === 以下、データベース操作関数 ===

export const db = {
    getUsers: async (): Promise<DBUser[]> => {
        const users = await getData<DBUser[]>('users');
        return users || [];
    },

    getUserById: async (id: string) => {
        const users = await getData<DBUser[]>('users');
        if (!users) return undefined;
        return users.find(u => u.id === id);
    },

    saveUser: async (user: DBUser) => {
        const users = (await getData<DBUser[]>('users')) || [];
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) {
            users[idx] = user;
        } else {
            users.push(user);
        }
        await setData('users', users);
        return user;
    },

    updateUserStats: async (id: string, updates: Partial<DBUser>) => {
        const users = (await getData<DBUser[]>('users')) || [];
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return null;

        const updatedUser = { ...users[idx], ...updates };
        users[idx] = updatedUser;
        await setData('users', users);
        return updatedUser;
    },

    getExrichedUser: async (id: string) => {
        const users = (await getData<DBUser[]>('users')) || [];
        const records = (await getData<HistoryRecord[]>('history')) || [];

        const userRecords = records.filter(r => r.userId === id);
        const totalQuestions = userRecords.length;
        const totalTimeSec = userRecords.reduce((acc, r) => acc + (r.timeSpentSec || 0), 0);
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
        const records = (await getData<HistoryRecord[]>('history')) || [];
        const newRecord: HistoryRecord = {
            ...record,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        };
        records.push(newRecord);
        await setData('history', records);
        return newRecord;
    },

    getHistoryByUserId: async (userId: string) => {
        const records = (await getData<HistoryRecord[]>('history')) || [];
        return records
            .filter(r => r.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    getHistoryById: async (id: string) => {
        const records = (await getData<HistoryRecord[]>('history')) || [];
        return records.find(r => r.id === id);
    }
};