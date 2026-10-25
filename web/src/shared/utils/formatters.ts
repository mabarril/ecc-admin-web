export function stripNonDigits(value?: string | null): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

export function formatDateBr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;

  const isoDateOnly = trimmed.split('T')[0] ?? trimmed;
  const parts = isoDateOnly.split('-');
  if (parts.length === 3 && parts[0]?.length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return trimmed;
}

export function formatDateIsoToSave(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dia, mes, ano] = trimmed.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  const digits = stripNonDigits(trimmed);
  if (digits.length === 8) {
    const dia = digits.slice(0, 2);
    const mes = digits.slice(2, 4);
    const ano = digits.slice(4, 8);
    return `${ano}-${mes}-${dia}`;
  }

  return '';
}

export function formatCpf(cpf?: string | null): string {
  if (!cpf) return '';
  const digits = stripNonDigits(cpf);
  if (digits.length !== 11) return String(cpf);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = stripNonDigits(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }
  return String(phone);
}

export function formatCep(cep?: string | null): string {
  if (!cep) return '';
  const digits = stripNonDigits(cep);
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  }
  return String(cep);
}
