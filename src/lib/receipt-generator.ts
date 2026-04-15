import jsPDF from "jspdf";
import logoSrc from "@/assets/logo-mesquita.png";
import signatureSrc from "@/assets/signature.png";

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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
  let result = `${numberToWords(intPart)} reais`;
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

  // Logo
  try {
    const logoImg = await loadImage(logoSrc);
    const logoW = 60;
    const logoH = (logoImg.height / logoImg.width) * logoW;
    doc.addImage(logoImg, "PNG", (pageWidth - logoW) / 2, 15, logoW, logoH);
  } catch {}

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGAMENTO", pageWidth / 2, 55, { align: "center" });

  // Body
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  let y = 75;
  const margin = 25;
  const maxW = pageWidth - margin * 2;

  const bodyText = `Recebi de ${data.tenantName}, inscrito no CPF n° ${data.cpf || "___.___.___-__"}, o valor de R$ ${data.amount.toFixed(2)} (${amountInWords(data.amount)}), referente ao pagamento de aluguel do mês de ${monthName?.toLowerCase()}, do imóvel situado em ${data.address}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}.`;

  const lines = doc.splitTextToSize(bodyText, maxW);
  doc.text(lines, margin, y);
  y += lines.length * 6 + 8;

  doc.text(`Forma de pagamento: ${data.paymentMethod}`, margin, y);
  y += 20;

  // Date
  const dateObj = new Date(data.paymentDate + "T12:00:00");
  const dateStr = `Fortaleza ${dateObj.getDate()} de ${MONTHS_PT[dateObj.getMonth()]?.toLowerCase()} de ${dateObj.getFullYear()}`;
  doc.text(dateStr, pageWidth / 2, y, { align: "center" });
  y += 25;

  // Signature
  try {
    const sigImg = await loadImage(signatureSrc);
    const sigW = 40;
    const sigH = (sigImg.height / sigImg.width) * sigW;
    doc.addImage(sigImg, "PNG", (pageWidth - sigW) / 2, y, sigW, sigH);
    y += sigH + 3;
  } catch {}

  // Signature line
  doc.line(pageWidth / 2 - 30, y, pageWidth / 2 + 30, y);
  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Maria Eneide da Silva", pageWidth / 2, y, { align: "center" });
  y += 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("LOCADORA", pageWidth / 2, y, { align: "center" });

  return doc;
}
