import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear auth cookies
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');

  return response;
}
