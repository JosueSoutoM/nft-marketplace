import {
  ENS_NAME_PATTERN,
  EVM_ADDRESS_PATTERN,
  PASSWORD_MIN_LENGTH,
  REFERRAL_CODE_PATTERN,
  SOLANA_ADDRESS_PATTERN,
  USERNAME_PATTERN,
  type NetworkId,
} from '@/api/contracts'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Informe o e-mail.'
  }
  return EMAIL_PATTERN.test(email) ? null : 'Informe um e-mail válido.'
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Informe o nome de usuário.'
  }
  return USERNAME_PATTERN.test(username)
    ? null
    : 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto ou sublinhado.'
}

export function validateNewPassword(password: string): string | null {
  if (!password) {
    return 'Informe a senha.'
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  return /[A-Za-z]/.test(password) && /\d/.test(password) ? null : 'A senha deve conter letras e números.'
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | null {
  if (!confirmation) {
    return 'Confirme a senha.'
  }
  return confirmation === password ? null : 'As senhas não conferem.'
}

export function validateText(value: string, label: string, min: number, max: number): string | null {
  if (!value) {
    return `Informe ${label}.`
  }
  if (value.length < min || value.length > max) {
    return `${label[0].toUpperCase()}${label.slice(1)} deve ter entre ${min} e ${max} caracteres.`
  }
  return null
}

export function validateEnsName(value: string): string | null {
  if (!value) {
    return 'Informe o nome ENS.'
  }
  return ENS_NAME_PATTERN.test(value) ? null : 'Use de 3 a 63 letras minúsculas, números ou hífen, terminando em .eth.'
}

export function validateReferralCode(value: string): string | null {
  if (!value) {
    return 'Informe o código de indicação.'
  }
  return REFERRAL_CODE_PATTERN.test(value) ? null : 'Use de 4 a 12 letras maiúsculas ou números.'
}

export function isAddressForNetwork(network: NetworkId, address: string): boolean {
  return network === 'solana' ? SOLANA_ADDRESS_PATTERN.test(address) : EVM_ADDRESS_PATTERN.test(address)
}

export function validateAddress(network: NetworkId | null, address: string): string | null {
  if (!address) {
    return 'Informe o endereço da carteira.'
  }
  if (!network) {
    return null
  }
  if (isAddressForNetwork(network, address)) {
    return null
  }
  return network === 'solana'
    ? 'Endereço Solana inválido: use de 32 a 44 caracteres base58.'
    : 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
}

export function validateSecondaryAddress(network: NetworkId | null, value: string | null): string | null {
  if (!value) {
    return null
  }
  if (ENS_NAME_PATTERN.test(value) || (network !== null && isAddressForNetwork(network, value))) {
    return null
  }
  return 'Informe um nome ENS (.eth) ou um endereço válido para a rede selecionada.'
}
