/**
 * Payment Receipt PDF Generator v2.0
 * Professional, Institution-Grade Receipt Design
 * Clean, Auditable, Scalable
 */

class ReceiptGenerator {
    constructor() {
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 25;
        this.contentWidth = this.pageWidth - (this.margin * 2);

        // Professional Color Palette (RGB)
        this.colors = {
            primary: [16, 185, 129],      // Green #10B981
            dark: [17, 24, 39],           // Dark text #111827
            gray: [107, 114, 128],        // Medium gray #6B7280
            lightGray: [156, 163, 175],   // Light gray #9CA3AF
            mutedGray: [209, 213, 219],   // Very muted #D1D5DB
            tableHeader: [249, 250, 251], // Table bg #F9FAFB
            border: [229, 231, 235],      // Border #E5E7EB
            totalsBg: [248, 250, 252],    // Totals section bg
            white: [255, 255, 255],
            balanceDue: [71, 85, 105]     // Neutral dark for balance (not alarming)
        };
    }

    async generate(data) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        // Add metadata
        doc.setProperties({
            title: 'Payment Receipt - ' + data.receiptId,
            subject: 'Payment Receipt for ' + data.studentName,
            author: "Abhi's Craft Soft",
            creator: "Abhi's Craft Soft Receipt System"
        });

        let y = this.margin;

        // === HEADER ===
        y = this.drawHeader(doc, y, data);

        // === PAYMENT STATUS BADGE ===
        y = this.drawStatusBadge(doc, y, data);

        // === AMOUNT PAID (Hero Section) ===
        y = this.drawAmountSection(doc, y, data);

        // === ISSUED TO / PAID ON ===
        y = this.drawRecipientInfo(doc, y, data);

        // === PAYMENT TABLE ===
        y = this.drawPaymentTable(doc, y, data);

        // === TOTALS SECTION (with background) ===
        y = this.drawTotals(doc, y, data);

        // === FOOTER with QR Code ===
        await this.drawFooter(doc, data.receiptId);

        // Save
        const fileName = 'Receipt_' + data.receiptId + '_' + data.studentName.replace(/\s+/g, '_') + '.pdf';
        doc.save(fileName);

        return fileName;
    }

    drawHeader(doc, y, data) {
        // Company Name (Brand)
        doc.setFontSize(20);
        doc.setTextColor(...this.colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text("Abhi's Craft Soft", this.margin, y);

        y += 10;

        // Subtle divider
        doc.setDrawColor(...this.colors.border);
        doc.setLineWidth(0.4);
        doc.line(this.margin, y, this.pageWidth - this.margin, y);

        y += 12;

        // Payment Receipt Title
        doc.setFontSize(24);
        doc.setTextColor(...this.colors.dark);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Receipt', this.margin, y);

        // Receipt ID on right side
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.gray);
        doc.setFont('helvetica', 'normal');
        doc.text('Receipt ID: ' + data.receiptId, this.pageWidth - this.margin, y, { align: 'right' });

        y += 6;

        // Receipt ID - Prominent, mono-style feel
        doc.setFontSize(11);
        doc.setTextColor(...this.colors.gray);
        doc.setFont('courier', 'normal');
        doc.text(data.receiptId, this.margin, y);

        y += 8;

        // Subtitle
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.lightGray);
        doc.setFont('helvetica', 'normal');
        doc.text('This is a payment receipt for your enrollment in ' + data.courseName + '.', this.margin, y);

        y += 15;

        return y;
    }

    drawStatusBadge(doc, y, data) {
        // Calculate payment status
        const historicalTotal = (data.paymentHistory || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPaid = historicalTotal + data.currentPayment;
        const balanceDue = data.totalFee - totalPaid;

        let statusText, badgeColor;
        if (balanceDue <= 0) {
            statusText = 'FULLY PAID';
            badgeColor = this.colors.primary;
        } else if (totalPaid > 0) {
            statusText = 'PARTIAL PAYMENT';
            badgeColor = [59, 130, 246]; // Blue #3B82F6
        } else {
            statusText = 'PENDING';
            badgeColor = [245, 158, 11]; // Amber #F59E0B
        }

        // Draw badge
        doc.setFontSize(8);
        const badgeWidth = doc.getTextWidth(statusText) + 10;
        doc.setFillColor(...badgeColor);
        doc.roundedRect(this.margin, y - 4, badgeWidth, 7, 1, 1, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(statusText, this.margin + 5, y);

        y += 12;

        return y;
    }

    drawAmountSection(doc, y, data) {
        // "AMOUNT PAID" - Lighter, smaller label
        doc.setFontSize(9);
        doc.setTextColor(...this.colors.lightGray);
        doc.setFont('helvetica', 'bold');
        doc.text('AMOUNT PAID', this.margin, y);

        // Green underline accent
        doc.setDrawColor(...this.colors.primary);
        doc.setLineWidth(1.2);
        doc.line(this.margin, y + 1.5, this.margin + 25, y + 1.5);

        y += 12;

        // Amount - Bold, dominant
        doc.setFontSize(32);
        doc.setTextColor(...this.colors.dark);
        doc.setFont('helvetica', 'bold');
        doc.text('Rs. ' + this.formatCurrency(data.currentPayment), this.margin, y);

        y += 7;

        // Payment mode - Below, muted grey
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.mutedGray);
        doc.setFont('helvetica', 'normal');
        doc.text('via ' + data.paymentMode, this.margin, y);

        y += 15;

        return y;
    }

    drawRecipientInfo(doc, y, data) {
        const col2X = 115;

        // Section divider
        doc.setDrawColor(...this.colors.border);
        doc.setLineWidth(0.2);
        doc.line(this.margin, y - 3, this.pageWidth - this.margin, y - 3);

        y += 8;

        // ISSUED TO label
        doc.setFontSize(8);
        doc.setTextColor(...this.colors.lightGray);
        doc.setFont('helvetica', 'bold');
        doc.text('ISSUED TO', this.margin, y);
        doc.text('PAID ON', col2X, y);

        y += 6;

        // Values
        doc.setFontSize(12);
        doc.setTextColor(...this.colors.dark);
        doc.setFont('helvetica', 'normal');
        doc.text(data.studentName, this.margin, y);
        doc.text(data.paymentDate, col2X, y);

        y += 5;

        // Phone - Green/Primary color
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.primary);
        doc.text(data.phone || '', this.margin, y);

        y += 15;

        return y;
    }

    drawPaymentTable(doc, y, data) {
        const col1X = this.margin;
        const col2X = 100;
        const col3X = this.pageWidth - this.margin;

        // Table header divider
        doc.setDrawColor(...this.colors.border);
        doc.setLineWidth(0.3);
        doc.line(this.margin, y - 2, this.pageWidth - this.margin, y - 2);

        // Table Header Background
        doc.setFillColor(...this.colors.tableHeader);
        doc.rect(this.margin - 2, y, this.contentWidth + 4, 8, 'F');

        y += 5;

        // Headers - ALL CAPS, consistent
        doc.setFontSize(7);
        doc.setTextColor(...this.colors.gray);
        doc.setFont('helvetica', 'bold');
        doc.text('NAME OF THE COURSE', col1X, y);
        doc.text('MODE OF PAYMENT', col2X, y);
        doc.text('AMOUNT PAID', col3X, y, { align: 'right' });

        y += 10;

        // Payment rows
        const allPayments = [...(data.paymentHistory || [])];
        allPayments.push({
            amount: data.currentPayment,
            mode: data.paymentMode,
            date: data.paymentDate,
            isCurrent: true
        });

        doc.setFontSize(10);

        allPayments.forEach((payment) => {
            // Course Name
            doc.setTextColor(...this.colors.dark);
            doc.setFont('helvetica', 'normal');
            doc.text(data.courseName, col1X, y);

            // Mode
            doc.setTextColor(...this.colors.gray);
            doc.text(payment.mode || 'Cash', col2X, y);

            // Amount
            const amt = 'Rs. ' + this.formatCurrency(payment.amount);
            if (payment.isCurrent) {
                doc.setTextColor(...this.colors.primary);
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setTextColor(...this.colors.dark);
            }
            doc.text(amt, col3X, y, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            y += 8;
        });

        y += 5;

        // Bottom line
        doc.setDrawColor(...this.colors.border);
        doc.line(this.margin, y, this.pageWidth - this.margin, y);

        y += 12;

        return y;
    }

    drawTotals(doc, y, data) {
        const labelX = 115;
        const valueX = this.pageWidth - this.margin;

        // Calculate
        const historicalTotal = (data.paymentHistory || []).reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPaid = historicalTotal + data.currentPayment;
        const balanceDue = data.totalFee - totalPaid;

        // Background for totals section
        doc.setFillColor(...this.colors.totalsBg);
        doc.rect(labelX - 5, y - 5, this.pageWidth - this.margin - labelX + 10, 38, 'F');

        // Subtle border
        doc.setDrawColor(...this.colors.border);
        doc.setLineWidth(0.3);
        doc.rect(labelX - 5, y - 5, this.pageWidth - this.margin - labelX + 10, 38);

        // Total Fee
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.gray);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Fee', labelX, y);
        doc.setTextColor(...this.colors.dark);
        doc.setFont('helvetica', 'bold');
        doc.text('Rs. ' + this.formatCurrency(data.totalFee), valueX, y, { align: 'right' });

        y += 10;

        // Amount Paid (Green)
        doc.setTextColor(...this.colors.primary);
        doc.setFont('helvetica', 'normal');
        doc.text('Amount Paid', labelX, y);
        doc.text('Rs. ' + this.formatCurrency(totalPaid), valueX, y, { align: 'right' });

        y += 10;

        // Balance Due - Prominent but calm
        if (balanceDue > 0) {
            doc.setTextColor(...this.colors.balanceDue);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('Balance Due', labelX, y);
            doc.text('Rs. ' + this.formatCurrency(balanceDue), valueX, y, { align: 'right' });
        } else {
            doc.setTextColor(...this.colors.primary);
            doc.setFont('helvetica', 'bold');
            doc.text('Fully Settled', labelX, y);
            doc.text('Rs. 0.00', valueX, y, { align: 'right' });
        }

        y += 25;

        return y;
    }

    async drawFooter(doc, receiptId) {
        const footerY = this.pageHeight - 45;

        // Top line - Primary color accent
        doc.setDrawColor(...this.colors.primary);
        doc.setLineWidth(0.5);
        doc.line(this.margin, footerY, this.pageWidth - this.margin, footerY);

        // Footer Left - Company Info
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.dark);
        doc.setFont('helvetica', 'bold');
        doc.text("Abhi's Craft Soft", this.margin, footerY + 8);

        doc.setFontSize(8);
        doc.setTextColor(...this.colors.gray);
        doc.setFont('helvetica', 'normal');
        doc.text('Plot No. 163, Vijayasree Colony,', this.margin, footerY + 14);
        doc.text('Vanasthalipuram, Hyderabad 500070', this.margin, footerY + 19);
        doc.text('Phone: +91 7842230900 | Email: team.craftsoft@gmail.com', this.margin, footerY + 26);

        // Footer Center - Verify instructions
        doc.setFontSize(9);
        doc.setTextColor(...this.colors.gray);
        doc.text('Scan to verify or visit', 105, footerY + 10);
        doc.setTextColor(...this.colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('craftsoft.co.in/verify', 105, footerY + 16);
        doc.setTextColor(...this.colors.gray);
        doc.setFont('helvetica', 'normal');
        doc.text('and enter Receipt ID.', 105, footerY + 22);

        // QR Code - Generate and add
        if (receiptId && typeof QRCode !== 'undefined') {
            const qrUrl = 'https://craftsoft.co.in/pages/verify.html?id=' + receiptId;

            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = 'position:absolute;left:-9999px;';
            document.body.appendChild(qrContainer);

            new QRCode(qrContainer, {
                text: qrUrl,
                width: 200,
                height: 200,
                colorDark: '#111827',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            const qrCanvas = qrContainer.querySelector('canvas');
            if (qrCanvas) {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                doc.addImage(qrDataUrl, 'PNG', this.pageWidth - this.margin - 25, footerY + 4, 22, 22);
            }

            document.body.removeChild(qrContainer);
        }

        // Bottom disclaimer
        doc.setFontSize(7);
        doc.setTextColor(...this.colors.lightGray);
        doc.text('This is a system-generated receipt and does not require a signature.', this.margin, footerY + 35);

        // Version timestamp
        const timestamp = new Date().toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
        doc.text('Version: ' + timestamp, this.pageWidth - this.margin, footerY + 35, { align: 'right' });
    }

    formatCurrency(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '0.00';
        return Number(amount).toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    static generateReceiptId() {
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000);
        return 'RCPT-' + year + '-' + random;
    }

    static formatDate(date) {
        if (!date) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
}

// Global instance
window.receiptGenerator = new ReceiptGenerator();

// Quick generate function
window.generateReceipt = function (student, payment) {
    const receiptData = {
        receiptId: ReceiptGenerator.generateReceiptId(),
        studentName: student.name || student.studentName || '',
        phone: student.phone || student.phoneNumber || '',
        courseName: student.course || student.courseName || '',
        totalFee: student.totalFee || 0,
        currentPayment: payment.amount || 0,
        paymentMode: payment.mode || 'Cash',
        paymentDate: ReceiptGenerator.formatDate(new Date()),
        paymentHistory: (student.paymentHistory || []).map(p => ({
            amount: p.amount || 0,
            mode: p.mode || 'Cash',
            date: ReceiptGenerator.formatDate(p.date)
        }))
    };
    return window.receiptGenerator.generate(receiptData);
};

console.log('Receipt Generator v2.0 loaded - Institution Grade');
