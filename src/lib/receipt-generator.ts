import jsPDF from "jspdf";
import logoSrc from "@/assets/logo-mesquita.png";
import signatureSrc from "@/assets/signature.png";

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function numberToWords(n: number): string {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (n === 0) return "zero";
  if (n === 100) return "cem";

  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;

  if (h > 0) parts.push(hundreds[h]);
  if (t === 1) parts.push(teens[u]);
  else {
    if (t > 0) parts.push(tens[t]);
    if (u > 0) parts.push(units[u]);
  }

  return parts.join(" e ");
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function amountInWords(value: number): string {
  const intPart = Math.floor(value);
  const cents = Math.round((value - intPart) * 100);
  let result = `${capitalize(numberToWords(intPart))} reais`;
  if (cents > 0) result += ` e ${numberToWords(cents)} centavos`;
  return result;
}

export interface ReceiptData {
  tenantName: string;
  cpf?: string;
  address: string;
  houseNumber?: string;
  amount: number;
  month: number;
  year: number;
  paymentDate: string;
  paymentMethod: string;
  paymentType?: string;
  receiptNumber?: string;
  signatureName?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function parseReceiptDate(paymentDate: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    return new Date(`${paymentDate}T12:00:00`);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(paymentDate)) {
    const [day, month, year] = paymentDate.split("/").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  const fallback = new Date(paymentDate);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

export function formatReceiptDate(paymentDate: string) {
  const dateObj = parseReceiptDate(paymentDate);
  return `Cascavel/CE, ${dateObj.getDate()} de ${MONTHS_PT[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
}

export async function generateReceipt(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 24;
  const maxWidth = pageWidth - margin * 2;
  const monthName = MONTHS_PT[data.month - 1] || "";
  const paymentType = (data.paymentType || "aluguel").toLowerCase();
  const receiptNumber = data.receiptNumber || `REC-${data.year}-${String(data.month).padStart(2, "0")}`;
  const signatureName = data.signatureName || "LOCADOR";
  const address = `${data.address}${data.houseNumber ? `, casa ${data.houseNumber}` : ""}`;

  doc.setDrawColor(212, 212, 216);
  doc.roundedRect(14, 14, pageWidth - 28, 269, 6, 6);

  try {
    const logoImg = await loadImage(logoSrc);
    const logoWidth = 56;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoImg, "PNG", (pageWidth - logoWidth) / 2, 18, logoWidth, logoHeight);
  } catch {}

  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RECIBO DE PAGAMENTO", margin, y);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(receiptNumber, pageWidth - margin, y, { align: "right" });

  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setTextColor(28, 25, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);

  const intro = `Recebi de ${data.tenantName}${data.cpf ? `, CPF ${data.cpf}` : ""}, a quantia de R$ ${data.amount.toFixed(2)} (${amountInWords(data.amount)}).`;
  const reference = `O valor refere-se ao ${paymentType} do mês de ${monthName}/${data.year}, referente ao imóvel localizado em ${address}.`;
  const method = `Forma de pagamento: ${data.paymentMethod}.`;

  const paragraphs = [intro, reference, method];

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * 6.5 + 6;
  }

  y += 8;
  doc.setFontSize(10.5);
  doc.setTextColor(87, 83, 78);
  doc.text(formatReceiptDate(data.paymentDate), pageWidth - margin, y, { align: "right" });

  y += 18;

  try {
    const signatureImg = await loadImage(signatureSrc);
    const signatureWidth = 42;
    const signatureHeight = (signatureImg.height / signatureImg.width) * signatureWidth;
    doc.addImage(signatureImg, "PNG", (pageWidth - signatureWidth) / 2, y, signatureWidth, signatureHeight);
    y += signatureHeight + 2;
  } catch {
    y += 16;
  }

  doc.setDrawColor(63, 63, 70);
  doc.line(pageWidth / 2 - 34, y, pageWidth / 2 + 34, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(28, 25, 23);
  doc.text(signatureName, pageWidth / 2, y, { align: "center" });

  return doc;
}
