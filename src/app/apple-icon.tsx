import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '40px',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
            fill="white"
          />
          <path
            d="M18 4L19 7L22 8L19 9L18 12L17 9L14 8L17 7L18 4Z"
            fill="white"
            opacity="0.7"
          />
          <path
            d="M6 16L7 19L10 20L7 21L6 24L5 21L2 20L5 19L6 16Z"
            fill="white"
            opacity="0.7"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
