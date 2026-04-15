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

export function amountInWords(value: number): string {
  const intPart = Math.floor(value);
  const cents = Math.round((value - intPart) * 100);
  let result = capitalize(numberToWords(intPart)) + " reais";
  if (cents > 0) result += ` e ${numberToWords(cents)} centavos`;
  return result;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export async function generateReceipt(data: ReceiptData): Promise<jsPDF> {
  const doc = new jsPDF();
  const monthName = MONTHS_PT[data.month - 1];
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const maxW = pageWidth - margin * 2;

  // Logo
  try {
    const logoImg = await loadImage(logoSrc);
    const logoW = 55;
    const logoH = (logoImg.height / logoImg.width) * logoW;
    doc.addImage(logoImg, "PNG", (pageWidth - logoW) / 2, 12, logoW, logoH);
  } catch {}

  // Title
  let y = 50;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGAMENTO", pageWidth / 2, y, { align: "center" });
  y += 15;

  // Body
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const paymentType = data.paymentType || "aluguel";
  const bodyText = `Recebi de ${data.tenantName}${data.cpf ? `, CPF n° ${data.cpf}` : ""}, o valor de R$ ${data.amount.toFixed(2)} (${amountInWords(data.amount)}) ${data.paymentMethod}, valor este referente ao ${paymentType.toLowerCase()} do mês de ${monthName}, do imóvel localizado na ${data.address}${data.houseNumber ? `, casa ${data.houseNumber}` : ""}.`;

  const bodyLines = doc.splitTextToSize(bodyText, maxW);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 7 + 20;

  // Date
  const dateObj = new Date(data.paymentDate + "T12:00:00");
  const dateStr = `Cascavel/CE, ${dateObj.getDate()} de ${MONTHS_PT[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
  doc.setFontSize(11);
  doc.text(dateStr, pageWidth / 2, y, { align: "center" });
  y += 25;

  // Signature
  try {
    const sigImg = await loadImage(signatureSrc);
    const sigW = 40;
    const sigH = (sigImg.height / sigImg.width) * sigW;
    doc.addImage(sigImg, "PNG", (pageWidth - sigW) / 2, y, sigW, sigH);
    y += sigH + 2;
  } catch {}

  // Signature line
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 35, y, pageWidth / 2 + 35, y);
  y += 5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LOCADOR", pageWidth / 2, y, { align: "center" });

  return doc;
}
