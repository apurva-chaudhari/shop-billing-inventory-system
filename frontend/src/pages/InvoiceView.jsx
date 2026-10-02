import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { downloadInvoicePdf } from "../utils/generateInvoicePdf";

export default function InvoiceView() {
  const { id } = useParams();
  const [bill, setBill] = useState(null);

  useEffect(() => {
    api.get(`/bills/${id}`).then((res) => setBill(res.data));
  }, [id]);

  if (!bill) return <p>Loading...</p>;

  function handleDownloadPdf() {
    downloadInvoicePdf(bill, localStorage.getItem("shopName"));
  }

  function handleWhatsAppShare() {
    // Build a short text summary of the bill to pre-fill in WhatsApp.
    // WhatsApp links can't auto-attach a file, so we tell the user to attach
    // the PDF they just downloaded once the chat opens.
    const shopName = bill.owner?.shopName || localStorage.getItem("shopName");
    const message =
      `Invoice ${bill.invoiceNo} from ${shopName}\n` +
      `Total: Rs.${bill.totalAmount.toFixed(2)}\n` +
      `Paid: Rs.${bill.paidAmount.toFixed(2)}\n` +
      (bill.totalAmount - bill.paidAmount > 0
        ? `Due: Rs.${(bill.totalAmount - bill.paidAmount).toFixed(2)}\n`
        : "") +
      `Thank you for your business!`;

    // If the customer has a phone number saved, open a chat with them directly.
    // Otherwise open WhatsApp with just the text, so the user picks a contact themselves.
    let phone = bill.customer?.phone ? bill.customer.phone.replace(/\D/g, "") : "";
    if (phone && phone.length === 10) phone = "91" + phone; // assume Indian number if no country code given

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    downloadInvoicePdf(bill, localStorage.getItem("shopName")); // so it's ready to attach
    window.open(url, "_blank");
  }

  return (
    <div>
      <div className="d-flex gap-2 mb-3 no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>
          🖨️ Print
        </button>
        <button className="btn btn-outline-primary" onClick={handleDownloadPdf}>
          ⬇️ Download PDF
        </button>
        <button className="btn btn-outline-primary" onClick={handleWhatsAppShare}>
          💬 Share on WhatsApp
        </button>
      </div>
      <p className="text-muted small no-print" style={{ maxWidth: "500px" }}>
        WhatsApp will open with the invoice summary pre-filled and the PDF downloaded to your device —
        just attach the downloaded file in the chat before sending.
      </p>

      <div id="invoice-print" className="card p-4" style={{ maxWidth: "500px" }}>
        <h4 className="text-center">{bill.owner?.shopName || localStorage.getItem("shopName")}</h4>
        {bill.owner?.phone && (
          <p className="text-center text-muted small mb-1">For queries: {bill.owner.phone}</p>
        )}
        {bill.owner?.gstNumber && (
          <p className="text-center text-muted small mb-1">GSTIN: {bill.owner.gstNumber}</p>
        )}
        <p className="text-center text-muted">Invoice: {bill.invoiceNo}</p>
        <p className="text-muted small">{new Date(bill.createdAt).toLocaleString()}</p>
        {bill.customer && <p>Customer: {bill.customer.name} {bill.customer.phone && `(${bill.customer.phone})`}</p>}

        <table className="table table-sm">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>GST</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {bill.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product.name}</td>
                <td>{item.quantity} {item.product.unit}</td>
                <td>₹{item.priceEach}</td>
                <td>{item.gstPercent}%</td>
                <td>₹{(item.subtotal + item.gstAmount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />
        <div className="d-flex justify-content-between"><span>Subtotal</span><span>₹{bill.subTotal.toFixed(2)}</span></div>
        <div className="d-flex justify-content-between"><span>GST</span><span>₹{bill.gstAmount.toFixed(2)}</span></div>
        <h5 className="d-flex justify-content-between mt-2"><span>Total</span><span>₹{bill.totalAmount.toFixed(2)}</span></h5>
        <p className="text-end">Paid: ₹{bill.paidAmount.toFixed(2)} ({bill.paymentMode})</p>
        {bill.totalAmount - bill.paidAmount > 0 && (
          <p className="text-end text-danger">Due: ₹{(bill.totalAmount - bill.paidAmount).toFixed(2)}</p>
        )}

        <p className="text-center text-muted small mt-3">Thank you for your business!</p>
      </div>
    </div>
  );
}
