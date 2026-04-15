import jsPDF from "jspdf";

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

export function generateReceipt(data: ReceiptData): jsPDF {
  const doc = new jsPDF();
  const monthName = MONTHS_PT[data.month - 1];

  doc.setFontSize(18);
  doc.text("RECIBO DE ALUGUEL", 105, 30, { align: "center" });

  doc.setFontSize(11);
  let y = 55;

  doc.text(`Recebi de ${data.tenantName}`, 20, y);
  y += 8;
  if (data.cpf) { doc.text(`CPF: ${data.cpf}`, 20, y); y += 8; }
  doc.text(`a importância de R$ ${data.amount.toFixed(2)} (${amountInWords(data.amount)})`, 20, y);
  y += 8;
  doc.text(`referente ao aluguel do mês de ${monthName}/${data.year}`, 20, y);
  y += 8;
  doc.text(`do imóvel situado em: ${data.address}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}`, 20, y);
  y += 8;
  doc.text(`Forma de pagamento: ${data.paymentMethod}`, 20, y);
  y += 8;
  doc.text(`Data: ${data.paymentDate}`, 20, y);

  y += 30;
  doc.line(50, y, 160, y);
  y += 6;
  doc.text("Assinatura do Locador", 105, y, { align: "center" });

  return doc;
}
