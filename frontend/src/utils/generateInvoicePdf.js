import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Builds a clean, printable-style PDF from a bill object (same data shape used by InvoiceView).
// Returns the jsPDF instance so the caller can either save() it or get a blob for sharing.
export function buildInvoicePdf(bill, shopNameFallback) {
  const doc = new jsPDF({ unit: "pt", format: "a5" }); // A5 = receipt-friendly size
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(bill.owner?.shopName || shopNameFallback || "Shop", pageWidth / 2, y, { align: "center" });
  y += 20;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  if (bill.owner?.phone) {
    doc.text(`For queries: ${bill.owner.phone}`, pageWidth / 2, y, { align: "center" });
    y += 14;
  }
  if (bill.owner?.gstNumber) {
    doc.text(`GSTIN: ${bill.owner.gstNumber}`, pageWidth / 2, y, { align: "center" });
    y += 14;
  }

  y += 6;
  doc.setFontSize(11);
  doc.text(`Invoice: ${bill.invoiceNo}`, 30, y);
  doc.text(new Date(bill.createdAt).toLocaleString(), pageWidth - 30, y, { align: "right" });
  y += 18;

  if (bill.customer) {
    doc.text(
      `Customer: ${bill.customer.name}${bill.customer.phone ? " (" + bill.customer.phone + ")" : ""}`,
      30, y
    );
    y += 18;
  }

  // Item table
  const rows = bill.items.map((item) => [
    item.product.name,
    `${item.quantity} ${item.product.unit}`,
    `Rs.${item.priceEach}`,
    `${item.gstPercent}%`,
    `Rs.${(item.subtotal + item.gstAmount).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Item", "Qty", "Price", "GST", "Amount"]],
    body: rows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [36, 93, 83] }, // matches the app's primary color
    margin: { left: 30, right: 30 },
  });

  let finalY = doc.lastAutoTable.finalY + 20;

  doc.setFontSize(10);
  doc.text(`Subtotal: Rs.${bill.subTotal.toFixed(2)}`, pageWidth - 30, finalY, { align: "right" });
  finalY += 14;
  doc.text(`GST: Rs.${bill.gstAmount.toFixed(2)}`, pageWidth - 30, finalY, { align: "right" });
  finalY += 16;

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(`Total: Rs.${bill.totalAmount.toFixed(2)}`, pageWidth - 30, finalY, { align: "right" });
  finalY += 18;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(`Paid: Rs.${bill.paidAmount.toFixed(2)} (${bill.paymentMode})`, pageWidth - 30, finalY, { align: "right" });
  finalY += 14;

  const due = bill.totalAmount - bill.paidAmount;
  if (due > 0) {
    doc.setTextColor(180, 40, 30);
    doc.text(`Due: Rs.${due.toFixed(2)}`, pageWidth - 30, finalY, { align: "right" });
    doc.setTextColor(0, 0, 0);
    finalY += 14;
  }

  finalY += 16;
  doc.setFontSize(9);
  doc.text("Thank you for your business!", pageWidth / 2, finalY, { align: "center" });

  return doc;
}

// Triggers a browser download of the PDF
export function downloadInvoicePdf(bill, shopNameFallback) {
  const doc = buildInvoicePdf(bill, shopNameFallback);
  doc.save(`${bill.invoiceNo}.pdf`);
}
