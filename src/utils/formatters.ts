import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date: string): string {
  try {
    const parsed = date.length === 10 ? parseISO(date + 'T00:00:00') : parseISO(date);
    return format(parsed, 'dd/MM/yyyy');
  } catch {
    return date;
  }
}

export function formatDateLong(date: string): string {
  try {
    const parsed = date.length === 10 ? parseISO(date + 'T00:00:00') : parseISO(date);
    return format(parsed, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return date;
  }
}

const ones = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete',
  'dezoito', 'dezenove',
];

const tens = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta',
  'oitenta', 'noventa',
];

const hundreds = [
  '', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

function integerToWords(n: number): string {
  if (n === 0) return 'zero';
  if (n < 0) return 'menos ' + integerToWords(-n);

  const parts: string[] = [];

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000);
    if (thousands === 1) {
      parts.push('mil');
    } else {
      parts.push(integerToWords(thousands) + ' mil');
    }
    n = n % 1000;
  }

  if (n >= 100) {
    const h = Math.floor(n / 100);
    if (n % 100 === 0) {
      parts.push(hundreds[h]);
    } else {
      parts.push(h === 1 ? 'cento' : hundreds[h]);
    }
    n = n % 100;
  }

  if (n >= 20) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (o > 0) {
      parts.push(tens[t] + ' e ' + ones[o]);
    } else {
      parts.push(tens[t]);
    }
  } else if (n > 0) {
    parts.push(ones[n]);
  }

  return parts.join(' e ');
}

export function numberToWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);

  let result = '';

  if (reais > 0) {
    result += integerToWords(reais) + (reais === 1 ? ' real' : ' reais');
  }

  if (centavos > 0) {
    if (reais > 0) result += ' e ';
    result += integerToWords(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  }

  if (reais === 0 && centavos === 0) {
    result = 'zero reais';
  }

  return result;
}

export function formatTime(time: string): string {
  return time;
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}
