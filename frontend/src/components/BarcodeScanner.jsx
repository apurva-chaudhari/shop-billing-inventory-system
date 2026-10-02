import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

// A small modal-style overlay that opens the camera and reports back the scanned code.
// Usage: <BarcodeScanner onScan={(code) => ...} onClose={() => ...} />
export default function BarcodeScanner({ onScan, onClose }) {
  const containerId = "barcode-scanner-region";
  const scannerRef = useRef(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // use the back camera on phones
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          // Prevent firing multiple times for the same scan
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScan(decodedText);
        },
        () => {
          // per-frame "no code found" callback — intentionally ignored, this fires constantly
        }
      )
      .catch((err) => {
        console.error("Could not start camera:", err);
        alert(
          "Couldn't access the camera. Make sure you're on localhost or HTTPS, and that camera permission is allowed for this site."
        );
        onClose();
      });

    return () => {
      // Stop the camera cleanly when the component unmounts
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.75)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div className="card p-3" style={{ width: "360px" }}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>Scan Barcode</strong>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Close</button>
        </div>
        <div id={containerId} />
        <p className="text-muted small mt-2 mb-0">Point the camera at a product's barcode.</p>
      </div>
    </div>
  );
}
