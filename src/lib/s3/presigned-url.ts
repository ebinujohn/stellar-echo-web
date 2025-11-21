import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface PresignedUrlOptions {
  expiresIn?: number; // Expiration time in seconds (default: 3600 = 1 hour)
}

let s3Client: S3Client | null = null;

/**
 * Initialize or get the S3 client singleton
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured. Please set AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in environment variables.');
    }

    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  return s3Client;
}

/**
 * Parse S3 URL to extract bucket and key
 * Supports formats:
 * - https://bucket-name.s3.region.amazonaws.com/path/to/file
 * - https://s3.region.amazonaws.com/bucket-name/path/to/file
 * - s3://bucket-name/path/to/file
 */
function parseS3Url(s3Url: string): { bucket: string; key: string } {
  try {
    // Handle s3:// protocol
    if (s3Url.startsWith('s3://')) {
      const urlWithoutProtocol = s3Url.substring(5);
      const firstSlashIndex = urlWithoutProtocol.indexOf('/');
      if (firstSlashIndex === -1) {
        throw new Error('Invalid S3 URL format');
      }
      const bucket = urlWithoutProtocol.substring(0, firstSlashIndex);
      const key = urlWithoutProtocol.substring(firstSlashIndex + 1);
      return { bucket, key };
    }

    // Handle https:// URLs
    const url = new URL(s3Url);

    // Format: https://bucket-name.s3.region.amazonaws.com/path/to/file
    if (url.hostname.includes('.s3.') || url.hostname.includes('.s3-')) {
      const bucket = url.hostname.split('.')[0];
      const key = url.pathname.substring(1); // Remove leading slash
      return { bucket, key };
    }

    // Format: https://s3.region.amazonaws.com/bucket-name/path/to/file
    if (url.hostname.startsWith('s3.') || url.hostname.startsWith('s3-')) {
      const pathParts = url.pathname.substring(1).split('/');
      const bucket = pathParts[0];
      const key = pathParts.slice(1).join('/');
      return { bucket, key };
    }

    throw new Error('Unsupported S3 URL format');
  } catch (error) {
    throw new Error(`Failed to parse S3 URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a presigned URL for downloading a file from S3
 *
 * @param s3Url - The S3 URL of the file (supports multiple formats)
 * @param options - Options for presigned URL generation
 * @returns A presigned URL that can be used to download the file
 */
export async function generatePresignedDownloadUrl(
  s3Url: string,
  options: PresignedUrlOptions = {}
): Promise<string> {
  const { expiresIn = 3600 } = options; // Default to 1 hour

  // Parse the S3 URL to extract bucket and key
  const { bucket, key } = parseS3Url(s3Url);

  // Get or create S3 client
  const client = getS3Client();

  // Create GetObjectCommand
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  // Generate presigned URL
  const presignedUrl = await getSignedUrl(client, command, { expiresIn });

  return presignedUrl;
}

/**
 * Validate if the S3 URL format is supported
 */
export function isValidS3Url(url: string | null | undefined): boolean {
  if (!url) return false;

  try {
    parseS3Url(url);
    return true;
  } catch {
    return false;
  }
}
