<script setup>
import { init } from '@telegram-apps/sdk'
import { onMounted } from 'vue'
import { backButton } from '@telegram-apps/sdk'

onMounted(() => {
  try {
    init()
    if (backButton.isSupported()) {
      backButton.mount()
    }
  } catch (error) {
    console.log('没有运行在Telegram内')
  }
})
</script>

<template>
  <router-view />
</template>

<style scoped></style>
