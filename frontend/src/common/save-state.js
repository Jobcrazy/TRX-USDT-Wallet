import { onActivated } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export function useKeepScrollPosition(elementRef) {
  let state = []

  onActivated(() => {
    const element = elementRef.value
    if (!element) {
      return
    }
    const array = toArray(element)
    array.forEach((el, index) => {
      if (el) {
        el.scrollLeft = state[index]?.left ?? 0
        el.scrollTop = state[index]?.top ?? 0
      }
    })
  })

  onBeforeRouteLeave(() => {
    const array = toArray(elementRef.value)
    state = array.map((el) => ({ left: el?.scrollLeft, top: el?.scrollTop }))
  })

  function toArray(element) {
    const array = []
    if (Array.isArray(element)) {
      for (const item of element) {
        array.push(item?.$el ?? item)
      }
    } else {
      array.push(element?.$el ?? element)
    }
    return array
  }
}
