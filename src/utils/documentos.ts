/** Utilitários de CPF/CNPJ: máscara, validação de dígitos verificadores e normalização. */

export function apenasDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

export function mascaraCNPJ(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function mascaraCPF(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Aplica CPF (≤11 dígitos) ou CNPJ (>11 dígitos) conforme o comprimento. */
export function mascaraDocumento(valor: string): string {
  const d = apenasDigitos(valor);
  return d.length > 11 ? mascaraCNPJ(d) : mascaraCPF(d);
}

export function validarCPF(valor: string): boolean {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // todos os dígitos iguais

  const calcDV = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const dv1 = calcDV(cpf.slice(0, 9), 10);
  if (dv1 !== parseInt(cpf[9], 10)) return false;
  const dv2 = calcDV(cpf.slice(0, 10), 11);
  return dv2 === parseInt(cpf[10], 10);
}

export function validarCNPJ(valor: string): boolean {
  const cnpj = apenasDigitos(valor);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false; // todos os dígitos iguais

  const calcDV = (base: string): number => {
    // Pesos cíclicos 2..9 aplicados da direita para a esquerda
    let soma = 0;
    let peso = 2;
    for (let i = base.length - 1; i >= 0; i--) {
      soma += parseInt(base[i], 10) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const dv1 = calcDV(cnpj.slice(0, 12));
  if (dv1 !== parseInt(cnpj[12], 10)) return false;
  const dv2 = calcDV(cnpj.slice(0, 13));
  return dv2 === parseInt(cnpj[13], 10);
}

/** Valida CPF ou CNPJ pelo comprimento. Documento vazio é considerado válido (opcional). */
export function validarDocumento(valor: string): boolean {
  const d = apenasDigitos(valor);
  if (d.length === 0) return true;
  if (d.length === 11) return validarCPF(d);
  if (d.length === 14) return validarCNPJ(d);
  return false;
}
