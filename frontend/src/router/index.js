import { createWebHistory, createRouter } from 'vue-router'

const Login = () => import('@/views/login/Login.vue')
const Home = () => import('@/views/home/Home.vue')
const Create = () => import('@/views/wallet/Create.vue')
const Wallet = () => import('@/views/wallet/Wallet.vue')
const Freeze = () => import('@/views/wallet/Freeze.vue')
const Receive = () => import('@/views/wallet/Receive.vue')
const Shared = () => import('@/views/wallet/Shared.vue')
const Send = () => import('@/views/wallet/Send.vue')
const USDT = () => import('@/views/wallet/USDT.vue')
const TRX = () => import('@/views/wallet/TRX.vue')
const Settings = () => import('@/views/settings/Settings.vue')
const Password = () => import('@/views/settings/Password.vue')
const Enable2FA = () => import('@/views/settings/Enable2FA.vue')
const Mnemonic = () => import('@/views/settings/Mnemonic.vue')
const USDT2TRX = () => import('@/views/swap/USDT2TRX.vue')
const TRX2USDT = () => import('@/views/swap/TRX2USDT.vue')

const routes = [
  {
    name: 'Login',
    path: '/',
    component: Login
  },
  { name: 'Create', path: '/create', component: Create },
  {
    name: 'Home',
    path: '/home',
    component: Home
  },
  {
    name: 'Wallet',
    path: '/wallet',
    component: Wallet
  },
  {
    name: 'Receive',
    path: '/receive',
    component: Receive
  },
  {
    name: 'Send',
    path: '/send',
    component: Send
  },
  {
    name: 'USDT',
    path: '/usdt',
    component: USDT
  },
  {
    name: 'TRX',
    path: '/trx',
    component: TRX
  },
  {
    name: 'Shared',
    path: '/shared',
    component: Shared
  },
  {
    name: 'Settings',
    path: '/settings',
    component: Settings
  },
  {
    name: 'Password',
    path: '/password',
    component: Password
  },
  {
    name: 'Mnemonic',
    path: '/mnemonic',
    component: Mnemonic
  },
  {
    name: 'Enable2FA',
    path: '/enable2fa',
    component: Enable2FA
  },
  {
    name: 'USDT2TRX',
    path: '/usdt2trx',
    component: USDT2TRX
  },
  {
    name: 'TRX2USDT',
    path: '/trx2usdt',
    component: TRX2USDT
  },
  {
    name: 'Freeze',
    path: '/freeze',
    component: Freeze
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
