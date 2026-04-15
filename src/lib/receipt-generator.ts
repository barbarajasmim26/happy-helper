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
  paymentType?: string;
}

// Locador data
const LOCADOR = {
  name: "MARIA ENEIDE DA SILVA",
  nationality: "brasileira",
  maritalStatus: "união estável",
  profession: "comerciante",
  cpf: "322.633.763-72",
  address: "Avenida Nova Fortaleza, 1391, Planalto Ayrton Senna, Fortaleza/CE, CEP: 61.930-350",
};

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
  let y = 48;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGAMENTO DE ALUGUEL", pageWidth / 2, y, { align: "center" });
  y += 4;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Locador section
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("LOCADOR: ", margin, y);
  doc.setFont("helvetica", "normal");
  const locadorText = `${LOCADOR.name}, ${LOCADOR.nationality}, ${LOCADOR.maritalStatus}, ${LOCADOR.profession}, inscrita no CPF sob o n° ${LOCADOR.cpf}, residente e domiciliada à ${LOCADOR.address}.`;
  const locadorLines = doc.splitTextToSize(locadorText, maxW - 22);
  doc.text(locadorLines, margin + 22, y);
  y += locadorLines.length * 5 + 8;

  // Locatário section
  doc.setFont("helvetica", "bold");
  doc.text("LOCATÁRIO: ", margin, y);
  doc.setFont("helvetica", "normal");
  const locatarioText = `${data.tenantName}${data.cpf ? `, inscrito(a) no CPF sob o n° ${data.cpf}` : ""}, residente e domiciliado(a) em ${data.address}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}.`;
  const locatarioLines = doc.splitTextToSize(locatarioText, maxW - 25);
  doc.text(locatarioLines, margin + 25, y);
  y += locatarioLines.length * 5 + 12;

  // Separator
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Receipt body
  doc.setFontSize(11);
  const paymentType = data.paymentType || "aluguel";
  const bodyText = `Recebi de ${data.tenantName}${data.cpf ? `, CPF n° ${data.cpf}` : ""}, o valor de R$ ${data.amount.toFixed(2)} (${amountInWords(data.amount)}), referente ao pagamento de ${paymentType.toLowerCase()} do mês de ${monthName?.toLowerCase()} de ${data.year}, do imóvel situado em ${data.address}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}.`;

  const bodyLines = doc.splitTextToSize(bodyText, maxW);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 6 + 8;

  // Payment method
  doc.setFont("helvetica", "bold");
  doc.text("Forma de pagamento: ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMethod, margin + 48, y);
  y += 18;

  // Date
  const dateObj = new Date(data.paymentDate + "T12:00:00");
  const dateStr = `Cascavel/CE, ${dateObj.getDate()} de ${MONTHS_PT[dateObj.getMonth()]?.toLowerCase()} de ${dateObj.getFullYear()}.`;
  doc.setFontSize(10);
  doc.text(dateStr, pageWidth / 2, y, { align: "center" });
  y += 22;

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
  y += 25;

  // Locatário signature line
  doc.line(pageWidth / 2 - 35, y, pageWidth / 2 + 35, y);
  y += 5;
  doc.text("LOCATÁRIO", pageWidth / 2, y, { align: "center" });

  return doc;
}
