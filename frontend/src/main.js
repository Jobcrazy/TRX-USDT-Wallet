import { createApp } from 'vue'
import router from './router'
import vant from 'vant'
import './style.css'
import 'vant/lib/index.css'
import App from './App.vue'
import { init, backButton } from '@telegram-apps/sdk'

try {
  init()
  if (backButton.isSupported()) backButton.mount()
} catch (error) {
  console.log('没有运行在Telegram内')
}

const app = createApp(App)
app.use(vant)
app.use(router).mount('#app')
