import fs from 'fs';
import path from 'path';
import { User } from '@/data/mockData';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is imported

const DB_PATH = path.join(process.cwd(), 'src/data/users.json');
const HISTORY_DB_PATH = path.join(process.cwd(), 'src/data/history.json');

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

function readDb(): DBUser[] {
    if (!fs.existsSync(DB_PATH)) {
        return [];
    }
    const file = fs.readFileSync(DB_PATH, 'utf-8');
    try {
        return JSON.parse(file);
    } catch (e) {
        return [];
    }
}

function writeDb(users: DBUser[]) {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function readHistoryDb(): HistoryRecord[] {
    if (!fs.existsSync(HISTORY_DB_PATH)) {
        return [];
    }
    const file = fs.readFileSync(HISTORY_DB_PATH, 'utf-8');
    try {
        return JSON.parse(file);
    } catch (e) {
        return [];
    }
}

function writeHistoryDb(records: HistoryRecord[]) {
    fs.writeFileSync(HISTORY_DB_PATH, JSON.stringify(records, null, 2));
}


export const db = {
    getUsers: () => readDb(),

    getUserById: (id: string) => {
        const users = readDb();
        return users.find(u => u.id === id);
    },

    saveUser: (user: DBUser) => {
        const users = readDb();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) {
            users[idx] = user;
        } else {
            users.push(user);
        }
        writeDb(users);
        return user;
    },

    updateUserStats: (id: string, updates: Partial<DBUser>) => {
        const users = readDb();
        const idx = users.findIndex(u => u.id === id);
        if (idx === -1) return null;

        const updatedUser = { ...users[idx], ...updates };
        users[idx] = updatedUser;
        writeDb(users);
        return updatedUser;
    },

    getExrichedUser: (id: string) => {
        const users = readDb();
        const records = readHistoryDb().filter(r => r.userId === id); // Fetch user history

        const totalQuestions = records.length;
        const totalTimeSec = records.reduce((acc, r) => acc + (r.timeSpentSec || 0), 0);
        const totalStudyTimeHours = Math.round((totalTimeSec / 3600) * 10) / 10; // Round to 1 decimal

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
    saveHistory: (record: Omit<HistoryRecord, 'id' | 'createdAt'>) => {
        const records = readHistoryDb();
        const newRecord: HistoryRecord = {
            ...record,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        };
        records.push(newRecord);
        writeHistoryDb(records);
        return newRecord;
    },

    getHistoryByUserId: (userId: string) => {
        const records = readHistoryDb();
        return records.filter(r => r.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },

    getHistoryById: (id: string) => {
        const records = readHistoryDb();
        return records.find(r => r.id === id);
    }
};
