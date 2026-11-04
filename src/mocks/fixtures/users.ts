import type { WalletDetails, WalletSlot } from '@/api/contracts'

export interface UserFixture {
  id: string
  email: string
  password: string
  passwordSalt: string
  displayName: string
  username: string
  ensName: string | null
  walletNickname: string | null
  createdAt: string
  wallets: Array<{ slot: WalletSlot; details: WalletDetails }>
  favoriteNftIds: string[]
}

export const userFixtures: UserFixture[] = [
  {
    id: 'user-ana',
    email: 'ana@kurio.test',
    password: 'Kurio#2026',
    passwordSalt: '6b7572696f2d616e612d73616c742d3031',
    displayName: 'Ana Ribeiro',
    username: 'anaribeiro',
    ensName: 'anaribeiro.eth',
    walletNickname: 'Cofre da Ana',
    createdAt: '2026-03-14T13:20:00.000Z',
    wallets: [
      {
        slot: 'primary',
        details: {
          displayName: 'Ana Ribeiro',
          nickname: 'Cofre da Ana',
          network: 'ethereum',
          profileName: 'anaribeiro',
          address: '0x3fA94c2E8b1D7a6C05e9B4f2d18A7c3E6b90D41a',
          secondaryAddress: null,
          walletType: 'metamask',
          referralCode: 'ANA2026',
          email: 'ana@kurio.test',
          ensName: 'anaribeiro.eth',
        },
      },
      {
        slot: 'secondary',
        details: {
          displayName: 'Ana Ribeiro',
          nickname: 'Reserva da Ana',
          network: 'polygon',
          profileName: 'anaribeiro',
          address: '0x8C21d5F07aB94e3D6c1E2f9A40b7D58c3E1aF62b',
          secondaryAddress: null,
          walletType: 'coinbase',
          referralCode: 'ANA2026',
          email: 'ana@kurio.test',
          ensName: 'anaribeiro.eth',
        },
      },
    ],
    favoriteNftIds: ['emerald-ape-042', 'ivory-baron-088'],
  },
  {
    id: 'user-bruno',
    email: 'bruno@kurio.test',
    password: 'Kurio#2026',
    passwordSalt: '6b7572696f2d6272756e6f2d73616c742d3032',
    displayName: 'Bruno Tavares',
    username: 'brunotavares',
    ensName: 'brunotavares.eth',
    walletNickname: 'Carteira do Bruno',
    createdAt: '2026-05-02T18:45:00.000Z',
    wallets: [
      {
        slot: 'primary',
        details: {
          displayName: 'Bruno Tavares',
          nickname: 'Carteira do Bruno',
          network: 'polygon',
          profileName: 'brunotavares',
          address: '0x51bE7D20c9A3f84E6d2B0a7C19F5e83D4c6A2b97',
          secondaryAddress: null,
          walletType: 'walletconnect',
          referralCode: 'BRUNO26',
          email: 'bruno@kurio.test',
          ensName: 'brunotavares.eth',
        },
      },
    ],
    favoriteNftIds: ['golden-beat-207'],
  },
]
