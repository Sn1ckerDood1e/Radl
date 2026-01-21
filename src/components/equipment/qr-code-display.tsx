'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  equipmentId: string;
  size?: number;
}

export function QRCodeDisplay({ equipmentId, size = 128 }: QRCodeDisplayProps) {
  // Use environment variable for base URL to work in all environments
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${equipmentId}`;

  return (
    <div className="inline-block p-4 bg-white rounded-lg border border-gray-200">
      <QRCodeSVG
        value={reportUrl}
        size={size}
        level="M" // Medium error correction - good balance
      />
      <p className="mt-2 text-xs text-gray-500 text-center">
        Scan to report damage
      </p>
    </div>
  );
}
