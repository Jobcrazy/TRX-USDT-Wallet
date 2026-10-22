<template>
  <div class="wrapper">
    <!-- Password input -->
    <van-password-input
      :value="password"
      :focused="showKeyboard"
      @focus="showKeyboard = true"
      :error-info="errorInfo"
      :info="props.info || t('common.enterPayPwd')"
    />
    <!-- Numeric keyboard -->
    <van-number-keyboard v-model="password" :show="showKeyboard" @blur="showKeyboard = false" />
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { ref, watch } from 'vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps({
  info: {
    type: String,
    default: ''
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
