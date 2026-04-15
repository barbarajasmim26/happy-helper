export interface WhatsAppMessage {
  phone: string;
  message: string;
}

export function openWhatsApp({ phone, message }: WhatsAppMessage) {
  const cleanPhone = phone.replace(/\D/g, "");
  const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${fullPhone}?text=${encoded}`, "_blank");
}

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface MessageTemplateData {
  name: string;
  amount: number;
  month: number;
  year: number;
  property: string;
  houseNumber?: string;
  dueDay?: number;
  lateFee?: number;
  interest?: number;
  totalWithFees?: number;
}

export function getMessageTemplates(data: MessageTemplateData) {
  const monthName = MONTHS_PT[data.month - 1] || "";
  return {
    reminder: `Olá ${data.name}! 😊\n\nLembramos que o aluguel de ${monthName}/${data.year} no valor de R$ ${data.amount.toFixed(2)} vence dia ${data.dueDay}.\n\nImóvel: ${data.property}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}\n\nQualquer dúvida, estamos à disposição!`,
    
    overdue: `Olá ${data.name},\n\nIdentificamos que o aluguel de ${monthName}/${data.year} está em atraso.\n\nValor original: R$ ${data.amount.toFixed(2)}\nMulta: ${data.lateFee || 2}%\nJuros: ${data.interest || 1}%\nTotal atualizado: R$ ${(data.totalWithFees || data.amount).toFixed(2)}\n\nImóvel: ${data.property}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}\n\nPor favor, regularize o quanto antes. Estamos à disposição!`,
    
    expiring: `Olá ${data.name}!\n\nInformamos que seu contrato de aluguel está próximo do vencimento.\n\nImóvel: ${data.property}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}\n\nEntre em contato para renovação. Obrigado!`,
    
    confirmation: `Olá ${data.name}! ✅\n\nConfirmamos o recebimento do aluguel de ${monthName}/${data.year} no valor de R$ ${data.amount.toFixed(2)}.\n\nObrigado pela pontualidade!`,
    
    welcome: `Olá ${data.name}! 🏠\n\nSeja bem-vindo(a) ao nosso imóvel!\n\nEndereço: ${data.property}${data.houseNumber ? `, Casa ${data.houseNumber}` : ""}\nAluguel: R$ ${data.amount.toFixed(2)}\nVencimento: todo dia ${data.dueDay}\n\nQualquer dúvida, estamos à disposição!`,
  };
}
