/**
 * EsimQRCode - Renders eSIM QR code as a PNG <img> element via canvas.
 *
 * iOS Safari only triggers the native "Add eSIM" long-press menu when the
 * QR code is a real raster image (<img> pointing to a data URL or PNG).
 * SVG-based QR codes (QRCodeSVG) are NOT recognised by iOS as eSIM codes.
 *
 * This component:
 * 1. Draws the QR code onto a hidden <canvas> using qrcode.react internals
 *    (via the QRCodeCanvas component).
 * 2. Converts the canvas to a PNG data URL.
 * 3. Renders a plain <img> tag so iOS can detect and act on it.
 */

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

interface EsimQRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function EsimQRCode({ value, size = 200, className }: EsimQRCodeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;

    // Small delay to ensure QRCodeCanvas has rendered into the DOM
    const timer = setTimeout(() => {
      const canvas = canvasRef.current?.querySelector("canvas");
      if (canvas) {
        try {
          const url = canvas.toDataURL("image/png");
          setDataUrl(url);
        } catch {
          // toDataURL can fail if canvas is tainted; keep SVG fallback
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [value, size]);

  return (
    <div className={className}>
      {/* Hidden canvas used only to generate the PNG data URL */}
      <div ref={canvasRef} style={{ position: "absolute", opacity: 0, pointerEvents: "none", top: -9999 }}>
        <QRCodeCanvas value={value} size={size} level="M" />
      </div>

      {/* Visible image — iOS recognises this as a scannable QR code */}
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="eSIM QR Code"
          width={size}
          height={size}
          style={{ imageRendering: "pixelated", display: "block" }}
        />
      ) : (
        // Fallback while data URL is being generated
        <QRCodeCanvas value={value} size={size} level="M" />
      )}
    </div>
  );
}
