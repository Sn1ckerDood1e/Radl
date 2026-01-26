'use client';

import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  equipmentId: string;
  equipmentName?: string;
  size?: number;
  showDownload?: boolean;
}

export function QRCodeDisplay({
  equipmentId,
  equipmentName,
  size = 128,
  showDownload = false,
}: QRCodeDisplayProps) {
  const qrRef = useRef<SVGSVGElement>(null);

  // Use environment variable for base URL, fallback to window.location.origin for dev
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const reportUrl = `${baseUrl}/report/${equipmentId}`;

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;

    // Create a larger canvas for print quality (300 DPI equivalent)
    const scaleFactor = 3;
    const padding = 20 * scaleFactor;
    const labelHeight = equipmentName ? 40 * scaleFactor : 0;
    const canvasSize = size * scaleFactor;
    const totalWidth = canvasSize + padding * 2;
    const totalHeight = canvasSize + padding * 2 + labelHeight;

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Convert SVG to image and draw on canvas
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw QR code centered
      ctx.drawImage(img, padding, padding, canvasSize, canvasSize);

      // Add equipment name label if provided
      if (equipmentName) {
        ctx.fillStyle = '#1f2937';
        ctx.font = `bold ${14 * scaleFactor}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          equipmentName,
          totalWidth / 2,
          canvasSize + padding + 28 * scaleFactor,
          totalWidth - padding
        );
      }

      // Trigger download
      const link = document.createElement('a');
      const fileName = equipmentName
        ? `qr-${equipmentName.toLowerCase().replace(/\s+/g, '-')}.png`
        : `qr-${equipmentId.substring(0, 8)}.png`;
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();

      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  }, [equipmentId, equipmentName, size]);

  return (
    <div className="inline-block">
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <QRCodeSVG
          ref={qrRef}
          value={reportUrl}
          size={size}
          level="M"
        />
        {equipmentName && (
          <p className="mt-2 text-sm font-medium text-gray-900 text-center truncate max-w-[128px]">
            {equipmentName}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 text-center">
          Scan to report damage
        </p>
      </div>

      {showDownload && (
        <button
          type="button"
          onClick={handleDownload}
          className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PNG
        </button>
      )}
    </div>
  );
}
