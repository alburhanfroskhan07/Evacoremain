"use client";

import { jsPDF } from "jspdf";

/**
 * Converts an SVG DOM element to a high-res PNG Data URL for jsPDF embedding
 */
export async function svgToPngDataUrl(svgElement) {
  return new Promise((resolve, reject) => {
    try {
      const xml = new XMLSerializer().serializeToString(svgElement);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const image64 = "data:image/svg+xml;base64," + svg64;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 300, 300);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = (e) => reject(e);
      img.src = image64;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Generate a printable Emergency Relief ID Card & Pass PDF
 *
 * @param {Object|Array} passOrPasses - Single pass object or array of passes
 * @param {string} [qrDataUrl] - Optional base64 PNG data URL of the QR code
 */
export async function generateEmergencyPassPDF(passOrPasses, qrDataUrl = null) {
  const passes = Array.isArray(passOrPasses) ? passOrPasses : [passOrPasses];
  if (passes.length === 0) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const issueDateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const expiryDate = new Date(now.getTime() + 72 * 60 * 60 * 1000);
  const expiryDateStr = expiryDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  passes.forEach((pass, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const name = pass.name || pass.evacueeName || "Registered Evacuee";
    const code = pass.voucherCode || pass.qrCode || pass.id || `RELIEF-${Date.now().toString(36).toUpperCase()}`;
    const shelter = pass.assignedShelterName || "Regional Relief Facility";
    const familySize = pass.familySize || 1;

    // ── Page Background & Outer Border ──
    doc.setFillColor(250, 248, 245);
    doc.rect(10, 10, 190, 277, "F");
    doc.setDrawColor(226, 215, 195);
    doc.setLineWidth(0.8);
    doc.roundedRect(10, 10, 190, 277, 4, 4, "S");

    // ── Top Header Banner (National Relief Header) ──
    doc.setFillColor(255, 90, 31); // Signature Flare Orange
    doc.roundedRect(12, 12, 186, 24, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("EMERGENCY RELIEF PASS & RATION ID CARD", 105, 21, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL FLOOD DISASTER EVACUATION & RATION ALLOCATION CERTIFICATE", 105, 29, { align: "center" });

    // ── Pass Container Card ──
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 215, 195);
    doc.setLineWidth(0.5);
    doc.roundedRect(18, 42, 174, 180, 4, 4, "FD");

    // ── Watermark / Security Strip ──
    doc.setFillColor(239, 246, 255);
    doc.rect(20, 44, 170, 12, "F");
    doc.setTextColor(2, 132, 199);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PRIORITY EVACUATION IDENTIFIER", 25, 52);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("VALID STATE DISASTER RECORD", 185, 52, { align: "right" });

    // ── Family Head & Details ──
    let y = 68;

    // Field: Head of Family
    doc.setTextColor(120, 113, 108);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("HEAD OF FAMILY / BENEFICIARY", 25, y);
    doc.setTextColor(28, 25, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(name.toUpperCase(), 25, y + 6);

    // Field: Family Members
    doc.setTextColor(120, 113, 108);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("FAMILY MEMBERS COVERED", 140, y);
    doc.setTextColor(255, 90, 31);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${familySize} PERSON(S)`, 140, y + 6);

    y += 18;
    // Field: Assigned Camp / Facility
    doc.setTextColor(120, 113, 108);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("DESIGNATED RELIEF CAMP / DISTRIBUTION CENTER", 25, y);
    doc.setTextColor(28, 25, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(shelter, 25, y + 5);

    y += 15;
    // Field: Validity & Issue Timestamps
    doc.setFillColor(250, 248, 245);
    doc.roundedRect(25, y, 160, 14, 2, 2, "F");
    doc.setTextColor(120, 113, 108);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("ISSUED ON:", 28, y + 5);
    doc.setTextColor(28, 25, 23);
    doc.setFontSize(8);
    doc.text(issueDateStr, 28, y + 10);

    doc.setTextColor(120, 113, 108);
    doc.setFontSize(7);
    doc.text("VALID UNTIL (+72 HOURS):", 95, y + 5);
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8);
    doc.text(expiryDateStr, 95, y + 10);

    y += 24;
    // ── QR Code Section ──
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 215, 195);
    doc.roundedRect(65, y, 80, 80, 3, 3, "FD");

    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, "PNG", 70, y + 5, 70, 70);
      } catch (err) {
        console.warn("QR code embed note:", err);
      }
    }

    y += 86;
    // ── Code text below QR ──
    doc.setFillColor(242, 236, 225);
    doc.roundedRect(50, y, 110, 10, 2, 2, "F");
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(28, 25, 23);
    doc.text(code, 105, y + 7, { align: "center" });

    // ── Footer Instructions ──
    y = 232;
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(18, y, 174, 38, 3, 3, "FD");

    doc.setTextColor(180, 83, 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("INSTRUCTIONS FOR HOLDER & DISPATCH RESCUE CREW:", 23, y + 6);

    doc.setTextColor(120, 113, 108);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("1. Present this QR code at camp check-in for automatic biometric/identity clearance.", 23, y + 12);
    doc.text("2. Redeemable for essential ration packets, baby formula, water, and emergency kits.", 23, y + 18);
    doc.text("3. This PDF card is 100% offline verifiable without active cellular tower connectivity.", 23, y + 24);
    doc.text("4. In case of lost paper copy, regenerate instantly from your phone's Family Pass Vault.", 23, y + 30);

    // Document footer info
    doc.setTextColor(168, 162, 158);
    doc.setFontSize(7);
    doc.text("Relief-Tracker Disaster Protocol Engine • Generated on " + new Date().toISOString(), 105, 282, { align: "center" });
  });

  const primaryCode = passes[0]?.voucherCode || passes[0]?.id || "PASS";
  doc.save(`Emergency-Relief-Pass-${primaryCode}.pdf`);
}
