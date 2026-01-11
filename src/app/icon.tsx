import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          fontFamily: 'Arial Black, sans-serif',
          fontWeight: 900,
          fontSize: 26,
          color: '#ffed00',
          letterSpacing: '-1px',
        }}
      >
        H
      </div>
    ),
    { ...size }
  )
}
