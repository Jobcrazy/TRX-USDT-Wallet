<template>
  <div class="content">
    <van-row class="welcome">
      <div class="nickname">{{ firstName }}</div>
      <div class="settings" @click="onSettings">
        <van-icon name="setting-o" size="24" />
      </div>
    </van-row>
    <div class="child">
      <Wallet />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { backButton } from '@telegram-apps/sdk'
import Wallet from '@/components/home/Wallet.vue'
import router from '../../router'

const firstName = ref('')

onMounted(() => {
  if (backButton.isMounted()) {
    backButton.hide()
  }

  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
  firstName.value = user.firstName
})

const onSettings = () => {
  router.push({ name: 'Settings' })
}
</script>

<style scoped lang="scss">
.content {
  display: flex;
  flex-direction: column;
  height: 100vh;

  .welcome {
    display: flex;
    padding: 20px 10px 10px 10px;
    align-items: center;
    justify-content: center;
    .nickname {
      flex-grow: 1;
      font-weight: bolder;
    }
  }

  .child {
    flex-grow: 1;
    overflow: hidden;
  }
}
</style>
