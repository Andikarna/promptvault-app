import { NextRequest, NextResponse } from 'next/server';
import { runAIAction } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, promptContent } = body;

    if (!action || !promptContent) {
      return NextResponse.json(
        { success: false, error: 'Missing action or promptContent parameters' },
        { status: 400 }
      );
    }

    const result = await runAIAction(action, promptContent);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Route Error in /api/ai:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing AI enhancement' },
      { status: 500 }
    );
  }
}
