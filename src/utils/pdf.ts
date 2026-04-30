import jsPDF from 'jspdf';
import { Receipt, Patient, Session, ClinicConfig } from '../types';
import { formatDate, formatDateLong, formatCurrency, numberToWords } from './formatters';

export function generateReceiptPDF(
  receipt: Receipt,
  patient: Patient,
  session: Session,
  config: ClinicConfig
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Header background
  doc.setFillColor(15, 42, 42);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Clinic name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(201, 168, 76);
  doc.text(config.psychiatristName, pageWidth / 2, y + 5, { align: 'center' });

  // CRM
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 220, 220);
  doc.text(config.crm, pageWidth / 2, y + 13, { align: 'center' });

  // Contact info
  doc.setFontSize(9);
  doc.text(config.address, pageWidth / 2, y + 20, { align: 'center' });
  doc.text(`Tel: ${config.phone} | Email: ${config.email}`, pageWidth / 2, y + 26, { align: 'center' });

  y = 55;

  // Receipt title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 42, 42);
  doc.text('RECIBO DE CONSULTA', pageWidth / 2, y, { align: 'center' });

  // Receipt number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Nº ${receipt.receiptNumber}`, pageWidth / 2, y + 8, { align: 'center' });

  y += 22;

  // Divider
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);

  y += 12;

  // Patient info section
  doc.setFillColor(248, 246, 242);
  doc.roundedRect(margin, y - 5, contentWidth, 32, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('DADOS DO PACIENTE', margin + 5, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`Nome: ${patient.name}`, margin + 5, y + 10);
  doc.text(`CPF: ${patient.cpf}`, margin + 5, y + 18);

  y += 40;

  // Service section
  doc.setFillColor(248, 246, 242);
  doc.roundedRect(margin, y - 5, contentWidth, 32, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('SERVIÇO PRESTADO', margin + 5, y + 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(receipt.description, margin + 5, y + 10);
  doc.text(`Horário: ${session.startTime} - ${session.endTime}`, margin + 5, y + 18);

  y += 40;

  // Value section
  doc.setFillColor(15, 42, 42);
  doc.roundedRect(margin, y - 5, contentWidth, 38, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(201, 168, 76);
  doc.text('VALOR', margin + 5, y + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(receipt.amount), pageWidth / 2, y + 15, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  const amountWords = numberToWords(receipt.amount);
  doc.text(`(${amountWords})`, pageWidth / 2, y + 25, { align: 'center' });

  y += 50;

  // Payment method
  if (session.paymentMethod) {
    const methodMap: Record<string, string> = {
      pix: 'PIX',
      cash: 'Dinheiro',
      card: 'Cartão',
      insurance: 'Plano de Saúde',
    };
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Forma de pagamento: ${methodMap[session.paymentMethod]}`, margin, y);
    y += 8;
  }

  // Issue date
  doc.setFontSize(10);
  doc.text(`Data de emissão: ${formatDateLong(receipt.issuedAt)}`, margin, y);

  y += 25;

  // Signature line
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.3);
  const sigX = pageWidth / 2 - 40;
  doc.line(sigX, y, sigX + 80, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(config.psychiatristName, pageWidth / 2, y + 6, { align: 'center' });
  doc.text(config.crm, pageWidth / 2, y + 12, { align: 'center' });

  // Footer
  y = 280;
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Documento emitido eletronicamente em ${formatDate(receipt.issuedAt)} | ${receipt.receiptNumber}`,
    pageWidth / 2,
    y + 6,
    { align: 'center' }
  );

  return doc;
}
