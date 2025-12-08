import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallDetail } from '@/lib/db/queries/call-details';
import { generatePresignedDownloadUrl, isValidS3Url } from '@/lib/s3/presigned-url';

/**
 * GET /api/calls/[call_id]/recording/download
 *
 * Generate a presigned URL for downloading a call recording from S3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    // Get the call details to ensure it belongs to the tenant and has a recording
    const call = await getCallDetail(callId, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

    if (!call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if recording URL exists
    if (!call.recordingUrl) {
      return NextResponse.json(
        { success: false, error: 'No recording available for this call' },
        { status: 404 }
      );
    }

    // Validate S3 URL format
    if (!isValidS3Url(call.recordingUrl)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recording URL format' },
        { status: 400 }
      );
    }

    // Get expiration time from query parameter (default: 1 hour)
    const { searchParams } = new URL(request.url);
    const expiresInParam = searchParams.get('expiresIn');
    const expiresIn = expiresInParam ? parseInt(expiresInParam, 10) : 3600;

    // Validate expiration time (between 1 minute and 7 days)
    if (expiresIn < 60 || expiresIn > 604800) {
      return NextResponse.json(
        { success: false, error: 'Expiration time must be between 60 seconds and 604800 seconds (7 days)' },
        { status: 400 }
      );
    }

    // Generate presigned URL
    const presignedUrl = await generatePresignedDownloadUrl(call.recordingUrl, {
      expiresIn,
    });

    return NextResponse.json({
      success: true,
      data: {
        presignedUrl,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);

    // Check if it's an AWS credentials error
    if (error instanceof Error && error.message.includes('AWS credentials')) {
      return NextResponse.json(
        { success: false, error: 'S3 service not configured. Please contact your administrator.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
