import {
  NETWORK_IDS,
  WALLET_TYPES,
  type NetworkId,
  type Profile,
  type Wallet,
  type WalletDetails,
  type WalletSlot,
  type WalletType,
} from '@/api/contracts'
import { fullEnsName, stripEns } from './checkout'
import {
  normalizeEmail,
  validateAddress,
  validateEmail,
  validateEnsName,
  validateReferralCode,
  validateSecondaryAddress,
  validateText,
} from './validation'

export const walletTypeLabels: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const walletSlotLabels: Record<WalletSlot, string> = {
  primary: 'Principal',
  secondary: 'Reserva',
}

export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

export const WALLET_FIELD_LABELS = {
  displayName: 'Nome de exibição',
  nickname: 'Apelido da carteira',
  network: 'Rede',
  profileName: 'Nome do perfil',
  address: 'Endereço da carteira',
  secondaryAddress: 'ENS ou carteira secundária',
  walletType: 'Tipo de carteira',
  referralCode: 'Código de indicação',
  email: 'E-mail',
  ensName: 'Nome ENS',
}

export type WalletField = keyof typeof WALLET_FIELD_LABELS
export type WalletFormValues = Record<WalletField, string>

export function walletFormValues(wallet: Wallet | undefined, profile: Profile | undefined): WalletFormValues {
  return {
    displayName: wallet?.displayName ?? profile?.displayName ?? '',
    nickname: wallet?.nickname ?? profile?.walletNickname ?? '',
    network: wallet?.network ?? '',
    profileName: wallet?.profileName ?? profile?.username ?? '',
    address: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    walletType: wallet?.walletType ?? '',
    referralCode: wallet?.referralCode ?? '',
    email: wallet?.email ?? profile?.email ?? '',
    ensName: stripEns(wallet?.ensName ?? profile?.ensName),
  }
}

function isNetwork(value: string): value is NetworkId {
  return (NETWORK_IDS as readonly string[]).includes(value)
}

function isWalletType(value: string): value is WalletType {
  return (WALLET_TYPES as readonly string[]).includes(value)
}

export function toWalletDetails(values: WalletFormValues): WalletDetails {
  return {
    displayName: values.displayName.trim(),
    nickname: values.nickname.trim(),
    network: values.network as NetworkId,
    profileName: values.profileName.trim(),
    address: values.address.trim(),
    secondaryAddress: values.secondaryAddress.trim() || null,
    walletType: values.walletType as WalletType,
    referralCode: values.referralCode.trim().toUpperCase(),
    email: normalizeEmail(values.email),
    ensName: fullEnsName(values.ensName),
  }
}

export function validateWalletForm(values: WalletFormValues): Partial<Record<WalletField, string>> {
  const details = toWalletDetails(values)
  const network = isNetwork(values.network) ? values.network : null
  return {
    displayName: validateText(details.displayName, 'o nome de exibição', 2, 50) ?? undefined,
    nickname: validateText(details.nickname, 'o apelido da carteira', 2, 40) ?? undefined,
    network: network ? undefined : 'Selecione uma rede.',
    profileName: validateText(details.profileName, 'o nome do perfil', 2, 50) ?? undefined,
    address: validateAddress(network, details.address) ?? undefined,
    secondaryAddress: validateSecondaryAddress(network, details.secondaryAddress) ?? undefined,
    walletType: isWalletType(values.walletType) ? undefined : 'Selecione o tipo de carteira.',
    referralCode: validateReferralCode(details.referralCode) ?? undefined,
    email: validateEmail(details.email) ?? undefined,
    ensName: validateEnsName(details.ensName) ?? undefined,
  }
}
