let toastEl = null

export function initUI() {
  toastEl = document.createElement('div')
  toastEl.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.85);
    background:rgba(255,255,255,0.12);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    color:#fff;padding:12px 26px;border-radius:26px;font-size:14px;letter-spacing:1px;
    pointer-events:none;opacity:0;transition:opacity 0.25s,transform 0.25s;
    border:1px solid rgba(255,255,255,0.2);text-align:center;font-family:'Courier New',monospace;`
  document.body.appendChild(toastEl)
}

let toastTimer
export function toast(msg, duration = 1500) {
  if (!toastEl) initUI()
  toastEl.textContent = msg
  toastEl.style.opacity = '1'
  toastEl.style.transform = 'translate(-50%,-50%) scale(1)'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastEl.style.opacity = '0'
    toastEl.style.transform = 'translate(-50%,-50%) scale(0.85)'
  }, duration)
}

export function makeHUD(el, timeout = 4000) {
  let timer
  const show = () => {
    el.classList.remove('hidden')
    clearTimeout(timer)
    timer = setTimeout(() => el.classList.add('hidden'), timeout)
  }
  return { show }
}

export function initPinchZoom(canvas, onZoom) {
  let initDist = null, initZoom = 1
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      initDist = Math.hypot(e.touches[1].clientX-e.touches[0].clientX, e.touches[1].clientY-e.touches[0].clientY)
      initZoom = onZoom.get()
    }
  }, { passive: true })
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initDist) {
      const d = Math.hypot(e.touches[1].clientX-e.touches[0].clientX, e.touches[1].clientY-e.touches[0].clientY)
      onZoom.set(Math.max(0.3, Math.min(8, initZoom * d / initDist)))
    }
  }, { passive: true })
  canvas.addEventListener('touchend', e => { if (e.touches.length < 2) initDist = null }, { passive: true })
  canvas.addEventListener('wheel', e => {
    e.preventDefault()
    onZoom.set(Math.max(0.3, Math.min(8, onZoom.get() * (e.deltaY < 0 ? 1.12 : 0.89))))
  }, { passive: false })
}
