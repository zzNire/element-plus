import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

import isServer from '@element-plus/utils/isServer'
import { UPDATE_MODEL_EVENT } from '@element-plus/utils/constants'
import PopupManager from '@element-plus/utils/popup-manager'
import { addUnit, clearTimer, isNumber } from '@element-plus/utils/util'
import { useLockScreen, useRestoreActive, useModal } from '@element-plus/hooks'

import type { Ref, CSSProperties, SetupContext } from 'vue'
import type { UseDialogProps } from './dialog'

export const CLOSE_EVENT = 'close'
export const OPEN_EVENT = 'open'
export const CLOSED_EVENT = 'closed'
export const OPENED_EVENT = 'opened'
export { UPDATE_MODEL_EVENT }

export default function (props: UseDialogProps, ctx: SetupContext, targetRef: Ref<HTMLElement>) {
  const visible = ref(false)
  const closed = ref(false)
  const dialogRef = ref(null)
  const openTimer = ref<TimeoutHandle>(null)
  const closeTimer = ref<TimeoutHandle>(null)
  const rendered = ref(false) // when destroyOnClose is true, we initialize it as false vise versa
  const zIndex = ref(props.zIndex || PopupManager.nextZIndex())
  const modalRef = ref<HTMLElement>(null)
  const headerRef = ref<HTMLElement>(null)

  const normalizeWidth = () => {
    if (isNumber(props.width))
      return `${props.width}px`
    else
      return props.width
  }

  const style = computed(() => {
    const style = {} as CSSProperties
    if (!props.fullscreen) {
      if (!props.draggable) {
        style.top = props.top
      }
      if (props.width) {
        style.width = normalizeWidth()
      }
    }
    return style
  })

  function afterEnter() {
    ctx.emit(OPENED_EVENT)
  }

  function afterLeave() {
    ctx.emit(CLOSED_EVENT)
    ctx.emit(UPDATE_MODEL_EVENT, false)
    if (props.destroyOnClose) {
      rendered.value = false
    }
  }

  function beforeLeave() {
    ctx.emit(CLOSE_EVENT)
  }

  function open() {
    clearTimer(closeTimer)
    clearTimer(openTimer)
    if (props.openDelay && props.openDelay > 0) {
      openTimer.value = window.setTimeout(() => {
        openTimer.value = null
        doOpen()
      }, props.openDelay)
    } else {
      doOpen()
    }
  }

  function close() {
    // if (this.willClose && !this.willClose()) return;
    clearTimer(openTimer)
    clearTimer(closeTimer)

    if (props.closeDelay && props.closeDelay > 0) {
      closeTimer.value = window.setTimeout(() => {
        closeTimer.value = null
        doClose()
      }, props.closeDelay)
    } else {
      doClose()
    }
  }

  function hide(shouldCancel: boolean) {
    if (shouldCancel) return
    closed.value = true
    visible.value = false
  }

  function handleClose() {
    if (props.beforeClose) {
      props.beforeClose(hide)
    } else {
      close()
    }
  }

  function onModalClick() {
    if (props.closeOnClickModal) {
      handleClose()
    }
  }

  function doOpen() {
    if (isServer) {
      return
    }

    // if (props.willOpen?.()) {
    //  return
    // }
    visible.value = true
  }

  function doClose() {
    visible.value = false
  }

  if (props.lockScroll) {
    useLockScreen(visible)
  }

  if (props.closeOnPressEscape) {
    useModal({
      handleClose,
    }, visible)
  }

  useRestoreActive(visible)

  watch(() => props.modelValue, val => {
    if (val) {
      closed.value = false
      open()
      rendered.value = true // enables lazy rendering
      ctx.emit(OPEN_EVENT)
      zIndex.value = props.zIndex ? zIndex.value++ : PopupManager.nextZIndex()
      // this.$el.addEventListener('scroll', this.updatePopper)
      nextTick(() => {
        if (targetRef.value) {
          targetRef.value.scrollTop = 0
        }
      })
    } else {
      // this.$el.removeEventListener('scroll', this.updatePopper
      if (visible.value) {
        close()
      }
    }
  })

  const onMousedown = e => {
    const downX = e.clientX
    const downY = e.clientY

    const targetRect = targetRef.value.getBoundingClientRect()
    const targetWidth = targetRect.width
    const targetHeight = targetRect.height

    const clientWidth = document.documentElement.clientWidth
    const clientHeight = document.documentElement.clientHeight

    const maxLeft = clientWidth - targetWidth
    const maxTop = clientHeight - targetHeight

    const onMousemove = e => {
      const moveX = e.clientX - downX
      const moveY = e.clientY - downY

      const left = Math.min(Math.max(targetRect.left + moveX, 0), maxLeft)
      const top = Math.min(Math.max(targetRect.top + moveY, 0), maxTop)

      targetRef.value.style.left = addUnit(left)
      targetRef.value.style.top = addUnit(top)
      targetRef.value.style.right = 'unset'
      targetRef.value.style.bottom = 'unset'
    }

    const onMouseup = () => {
      document.removeEventListener('mousemove', onMousemove)
      document.removeEventListener('mouseup', onMouseup)
    }

    document.addEventListener('mousemove', onMousemove)
    document.addEventListener('mouseup', onMouseup)
  }

  onMounted(() => {
    if (props.modelValue) {
      visible.value = true
      rendered.value = true // enables lazy rendering
      open()
    }
    if (!props.fullscreen && props.draggable) {
      targetRef.value.style.top = props.top
      headerRef.value = targetRef.value.querySelector('.el-dialog__header')
      headerRef.value.addEventListener('mousedown', onMousedown)
    }
  })

  onBeforeUnmount(() => {
    if (!props.fullscreen && props.draggable) {
      headerRef.value.removeEventListener('mousedown', onMousedown)
    }
  })

  return {
    afterEnter,
    afterLeave,
    beforeLeave,
    handleClose,
    onModalClick,
    closed,
    dialogRef,
    style,
    rendered,
    modalRef,
    headerRef,
    visible,
    zIndex,
  }
}
