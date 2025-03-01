<template>
  <div class="wrapper">
    <!-- 密码输入框 -->
    <van-password-input
      :value="password"
      :focused="showKeyboard"
      @focus="showKeyboard = true"
      :error-info="errorInfo"
      :info="props.info"
    />
    <!-- 数字键盘 -->
    <van-number-keyboard v-model="password" :show="showKeyboard" @blur="showKeyboard = false" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  info: {
    type: String,
    default: '请输入支付密码'
  }
})

const password = ref('')
const showKeyboard = ref(true)
const errorInfo = ref('')
const emit = defineEmits(['password', 'cancel'])

watch(password, (newVal) => {
  if (newVal.length === 6) {
    emit('password', newVal)
    password.value = ''
  }
})

watch(showKeyboard, (newVal) => {
  if (!newVal) {
    emit('cancel')
    password.value = ''
  }
})
</script>

<style scoped lang="scss">
.wrapper {
  padding: 20px 10px;
}
</style>
