import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUsers = db.getUsers();
        if (existingUsers.some(u => u.email === email)) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            );
        }

        const newUser = {
            id: uuidv4(),
            name,
            email,
            password, // In a real app, hash this!
            level: 1,
            currentExp: 0,
            maxExp: 100,
            ranking: 0, // Will be calculated on fetch
            totalQuestions: 0,
            totalStudyTimeHours: 0, // Changed to match standardized number format
            createdAt: new Date().toISOString()
        };

        db.saveUser(newUser);

        return NextResponse.json({
            success: true,
            user: { id: newUser.id, name: newUser.name }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
