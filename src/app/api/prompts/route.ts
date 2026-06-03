import { NextResponse } from 'next/server';
import { db } from '@/lib/db/db';

export async function GET() {
  try {
    const [prompts, categories, collections, activities] = await Promise.all([
      db.getPrompts(),
      db.getCategories(),
      db.getCollections(),
      db.getActivities(),
    ]);

    return NextResponse.json({
      success: true,
      prompts,
      categories,
      collections,
      activities,
    });
  } catch (error) {
    console.error('API Error fetching prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch database content' },
      { status: 500 }
    );
  }
}
