import { createApp } from 'vue'
import router from './router'
import vant from 'vant'
import './style.css'
import 'vant/lib/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(vant)
app.use(router).mount('#app')
