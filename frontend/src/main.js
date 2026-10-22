import { t } from '@/i18n'
import { createApp } from 'vue'
import router from './router'
import vant from 'vant'
import './style.css'
import 'vant/lib/index.css'
import App from './App.vue'
import { i18n } from './i18n'
import { init, backButton } from '@telegram-apps/sdk'

try {
  init()
  if (backButton.isSupported()) backButton.mount()
} catch (error) {
  console.log(t('common.outsideTelegram'))
}

document.documentElement.lang = i18n.global.locale.value
document.title = t('common.miaowaWallet')

const app = createApp(App)
app.use(vant)
app.use(i18n)
app.use(router).mount('#app')
