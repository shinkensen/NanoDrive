import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const hash = await request.text();
    
    const response = await fetch('http://localhost:3001/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: hash,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in auth API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
