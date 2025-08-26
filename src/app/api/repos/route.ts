import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const repos = await db.getIndexedRepos(userId);
    return NextResponse.json({ repos });
  } catch (error) {
    console.error('Error fetching indexed repos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch indexed repos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { repo_owner, repo_name, metadata } = body;

    if (!repo_owner || !repo_name) {
      return NextResponse.json(
        { error: 'repo_owner and repo_name are required' },
        { status: 400 }
      );
    }

    const repo = await db.addIndexedRepo({
      user_id: userId,
      repo_owner,
      repo_name,
      metadata
    });

    return NextResponse.json({ repo });
  } catch (error) {
    console.error('Error adding indexed repo:', error);
    return NextResponse.json(
      { error: 'Failed to add indexed repo' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const repoOwner = searchParams.get('owner');
    const repoName = searchParams.get('name');

    if (!repoOwner || !repoName) {
      return NextResponse.json(
        { error: 'owner and name parameters are required' },
        { status: 400 }
      );
    }

    await db.removeIndexedRepo(userId, repoOwner, repoName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing indexed repo:', error);
    return NextResponse.json(
      { error: 'Failed to remove indexed repo' },
      { status: 500 }
    );
  }
}