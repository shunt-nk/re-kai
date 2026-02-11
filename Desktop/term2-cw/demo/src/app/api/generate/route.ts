import { NextResponse } from 'next/server';
import { generateProblem } from '@/lib/generator';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subject, unit } = body;

        console.log("Generating problem for:", subject, unit);

        const problem = await generateProblem(subject, unit);

        return NextResponse.json(problem);

    } catch (error: any) {
        console.error("API Generate Error:", error);
        return NextResponse.json({ error: 'Failed to generate problem' }, { status: 500 });
    }
}
