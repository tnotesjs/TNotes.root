import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useResponsive() {
  const isCompact = ref(false)
  let resizeObserver: ResizeObserver | null = null

  const checkContainerWidth = () => {
    const container = document.querySelector('.knowledge-navigator-container')
    if (container) {
      isCompact.value = container.clientWidth < 960
    }
  }

  onMounted(() => {
    checkContainerWidth()

    const container = document.querySelector('.knowledge-navigator-container')
    if (container) {
      resizeObserver = new ResizeObserver(checkContainerWidth)
      resizeObserver.observe(container)
    }
  })

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
    }
  })

  return {
    isCompact,
  }
}
