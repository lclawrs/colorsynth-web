import { createGL, compileProgram, createQuad, bindQuad, setUniforms, resize } from '../../lib/gl.js'
import { VS_QUAD, COMPLEX_MATH } from '../../lib/glsl.js'
import { toast, initUI } from '../../lib/ui.js'
import { Pane } from 'tweakpane'

const canvas = document.getElementById('canvas')
const gl = createGL(canvas)

// Initialize UI for toast
initUI()

// ── Fragment shader ───────────────────────────────────────────────────────────
const FS = `
${COMPLEX_MATH}

uniform vec2  u_res;
uniform vec2  u_center;     // viewport center in complex plane
uniform float u_scale;      // units per pixel
uniform vec2  u_julia_c;    // Julia parameter (used when u_julia > 0)
uniform float u_julia;      // 0=Mandelbrot, 1=Julia
uniform float u_max_iter;
uniform float u_color_mode; // 0=smooth, 1=bands, 2=orbit
uniform float u_colormap;   // 0=psychedelic, 1=fire, 2=aurora, 3=ocean, 4=neon
uniform float u_time;       // for animated Julia rotation

// ── Colormaps ─────────────────────────────────────────────────────────────────
vec3 cmap_psychedelic(float t) {
  return 0.5+0.5*vec3(sin(t*6.28+0.0),sin(t*6.28+2.094),sin(t*6.28+4.189));
}
vec3 cmap_fire(float t) {
  return vec3(
    smoothstep(0.0,0.5,t),
    smoothstep(0.3,0.8,t),
    smoothstep(0.7,1.0,t)
  );
}
vec3 cmap_aurora(float t) {
  vec3 a=vec3(0.2,0.7,0.4), b=vec3(0.5,0.3,0.5), c2=vec3(1.,1.,0.5), d=vec3(0.,0.15,0.2);
  return a+b*cos(6.28318*(c2*t+d));
}
vec3 cmap_ocean(float t) {
  return 0.5+0.5*vec3(sin(t*6.28+4.0),sin(t*6.28+4.8),sin(t*6.28+6.2));
}
vec3 cmap_neon(float t) {
  float r=0.5+0.5*sin(t*9.42+0.), g=0.5+0.5*sin(t*9.42+2.094), b=0.5+0.5*sin(t*9.42+4.189);
  return vec3(r,g,b) * (0.6+0.4*sin(t*18.85));
}

vec3 applyColormap(float t) {
  if (u_colormap < 0.5) return cmap_psychedelic(t);
  if (u_colormap < 1.5) return cmap_fire(t);
  if (u_colormap < 2.5) return cmap_aurora(t);
  if (u_colormap < 3.5) return cmap_ocean(t);
  return cmap_neon(t);
}

// ── Main iteration ─────────────────────────────────────────────────────────────
void main() {
  vec2 fc = gl_FragCoord.xy;
  // Map pixel to complex plane
  vec2 uv = (fc - u_res*0.5) * u_scale + u_center;

  vec2 z, c;
  if (u_julia > 0.5) {
    z = uv;
    // Animated Julia: c rotates if u_time > 0
    float angle = u_time * 0.25;
    vec2 baseC = u_julia_c;
    c = vec2(baseC.x*cos(angle)-baseC.y*sin(angle), baseC.x*sin(angle)+baseC.y*cos(angle));
  } else {
    z = vec2(0.0);
    c = uv;
  }

  float orbitMin = 1e10;
  int i = 0;
  int maxI = int(u_max_iter);
  for (int iter=0; iter<1024; iter++) {
    if (iter >= maxI) break;
    // z = z^2 + c
    z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
    // Orbit trap: distance to nearest integer lattice point
    vec2 nearest = floor(z + 0.5);
    orbitMin = min(orbitMin, length(z - nearest));
    i++;
    if (dot(z,z) > 64.0) break;
  }

  // Escaped — color it
  vec3 col = vec3(0.0);
  if (i < maxI || u_julia > 0.5 && dot(z,z) <= 64.0) {
    if (i >= maxI) {
      // Interior — black with slight orbit color
      if (u_color_mode > 1.5) col = applyColormap(orbitMin * 0.1) * 0.15;
      else col = vec3(0.0);
    } else {
      float smooth_i;
      if (u_color_mode < 0.5) {
        // Smooth continuous
        float logz = log(dot(z,z)) * 0.5;
        smooth_i = float(i) + 1.0 - log(logz/log(2.0))/log(2.0);
        smooth_i = max(0.0, smooth_i);
        col = applyColormap(fract(smooth_i * 0.04));
      } else if (u_color_mode < 1.5) {
        // Bands
        col = applyColormap(fract(float(i) * 0.04));
      } else {
        // Orbit trap
        col = applyColormap(fract(orbitMin * 2.0));
      }
    }
  }

  // Edge darkening / interior glow
  if (i >= maxI) {
    col = mix(col, vec3(0.0), 0.85);
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

// ── Compile ───────────────────────────────────────────────────────────────────
let prog
try {
  prog = compileProgram(gl, VS_QUAD, FS)
} catch(e) {
  console.error(e)
  document.body.innerHTML = `<pre style="color:white;padding:20px;font-size:11px">${e.message}</pre>`
  throw e
}
const quad = createQuad(gl)
bindQuad(gl, prog, quad)
gl.useProgram(prog)

// ── State ─────────────────────────────────────────────────────────────────────
const params = {
  maxIter: 256,
  colorMode: 'smooth',  // smooth | bands | orbit
  juliaMode: false,
  animateJulia: true,
  colormap: 'psychedelic',
  juliaC: { x: -0.7, y: 0.27 },
}

// Viewport state (high-precision)
let centerX = -0.5, centerY = 0.0
let zoom = 200.0  // pixels per unit

// Conversion helpers
const colormapIndex = { psychedelic:0, fire:1, aurora:2, ocean:3, neon:4 }
const colorModeIndex = { smooth:0, bands:1, orbit:2 }

// Info bar
const infoZoom  = document.getElementById('info-zoom')
const infoCoord = document.getElementById('info-coord')
const infoMode  = document.getElementById('info-mode')
const fpsEl     = document.getElementById('corner-tr')

function updateInfoBar() {
  const scale = 1.0 / zoom
  const zoomLabel = zoom < 1000 ? zoom.toFixed(0)+'px/u' : (zoom/1000).toFixed(2)+'Kpx/u'
  infoZoom.textContent  = `zoom ${zoomLabel}`
  infoCoord.textContent = `${centerX.toFixed(6)}, ${centerY.toFixed(6)}`
  infoMode.textContent  = params.juliaMode ? `JULIA (${params.juliaC.x.toFixed(3)}, ${params.juliaC.y.toFixed(3)})` : 'MANDELBROT'
}

// ── Tweakpane ─────────────────────────────────────────────────────────────────
const pane = new Pane({ title: 'FRACTAL', expanded: true })

pane.addBinding(params, 'maxIter', { min:32, max:1024, step:16, label:'Iterations' })
pane.addBinding(params, 'colorMode', { label:'Coloring', options: { Smooth:'smooth', Bands:'bands', 'Orbit Trap':'orbit' } })
pane.addBinding(params, 'colormap', { label:'Palette', options: { Psychedelic:'psychedelic', Fire:'fire', Aurora:'aurora', Ocean:'ocean', Neon:'neon' } })
pane.addBinding(params, 'juliaMode', { label:'Julia Mode' })
pane.addBinding(params, 'animateJulia', { label:'Animate Julia' })
pane.addBinding(params.juliaC, 'x', { min:-2, max:2, step:0.001, label:'Julia Re' })
pane.addBinding(params.juliaC, 'y', { min:-2, max:2, step:0.001, label:'Julia Im' })

const resetBtn = pane.addButton({ title:'Reset View' })
resetBtn.on('click', () => { centerX=-0.5; centerY=0; zoom=200; })

// ── Render ────────────────────────────────────────────────────────────────────
let frameCount=0, lastFps=performance.now()
let animTime=0

function render(now) {
  requestAnimationFrame(render)
  resize(gl, canvas)
  animTime = now / 1000

  const scale = 1.0 / zoom
  const cmIdx = colormapIndex[params.colormap] ?? 0
  const cmodeIdx = colorModeIndex[params.colorMode] ?? 0

  gl.useProgram(prog)
  setUniforms(gl, prog, {
    u_res:        [canvas.width, canvas.height],
    u_center:     [centerX, centerY],
    u_scale:      scale,
    u_julia_c:    [params.juliaC.x, params.juliaC.y],
    u_julia:      params.juliaMode ? 1.0 : 0.0,
    u_max_iter:   params.maxIter,
    u_color_mode: cmodeIdx,
    u_colormap:   cmIdx,
    u_time:       params.animateJulia && params.juliaMode ? animTime : 0.0,
  })
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  frameCount++
  if (now - lastFps > 1000) {
    fpsEl.textContent = frameCount + ' fps'
    frameCount = 0; lastFps = now
  }
  updateInfoBar()
}
requestAnimationFrame(render)

// ── Pan & zoom (touch) ────────────────────────────────────────────────────────
let dragStart = null, dragCenter = null
let initDist = null, initZoom = 200

canvas.addEventListener('touchstart', e => {
  if (e.touches.length === 1) {
    dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    dragCenter = { x: centerX, y: centerY }
  } else if (e.touches.length === 2) {
    initDist  = Math.hypot(e.touches[1].clientX-e.touches[0].clientX, e.touches[1].clientY-e.touches[0].clientY)
    initZoom  = zoom
    dragStart = null
  }
}, { passive: true })

canvas.addEventListener('touchmove', e => {
  if (e.touches.length === 1 && dragStart) {
    const dx = e.touches[0].clientX - dragStart.x
    const dy = e.touches[0].clientY - dragStart.y
    centerX = dragCenter.x - dx / zoom
    centerY = dragCenter.y + dy / zoom
  } else if (e.touches.length === 2 && initDist) {
    const d = Math.hypot(e.touches[1].clientX-e.touches[0].clientX, e.touches[1].clientY-e.touches[0].clientY)
    zoom = Math.max(50, Math.min(1e10, initZoom * d / initDist))
  }
}, { passive: true })

canvas.addEventListener('touchend', e => {
  if (e.touches.length === 0) {
    dragStart = null; initDist = null
  }
}, { passive: true })

// Double-tap to zoom in 3×
let lastTap = 0
canvas.addEventListener('touchend', e => {
  const now = Date.now()
  if (now - lastTap < 300 && e.changedTouches.length === 1) {
    const t = e.changedTouches[0]
    const x = (t.clientX - window.innerWidth/2)  / zoom + centerX
    const y = (t.clientY - window.innerHeight/2) / zoom * -1 + centerY  // flip Y
    // Zoom in 3× toward tap point
    centerX = x + (centerX - x) / 3
    centerY = y + (centerY - y) / 3
    zoom *= 3
    toast(`zoom ${(zoom/200).toFixed(1)}×`)
  }
  lastTap = now
}, { passive: true })

// Mouse pan
let mouseDown = false, mouseLast = null, mouseCenter = null
canvas.addEventListener('mousedown', e => {
  mouseDown = true
  mouseLast = { x: e.clientX, y: e.clientY }
  mouseCenter = { x: centerX, y: centerY }
})
canvas.addEventListener('mousemove', e => {
  if (!mouseDown) return
  const dx = e.clientX - mouseLast.x
  const dy = e.clientY - mouseLast.y
  centerX = mouseCenter.x - dx / zoom
  centerY = mouseCenter.y + dy / zoom
})
canvas.addEventListener('mouseup', () => mouseDown = false)
canvas.addEventListener('mouseleave', () => mouseDown = false)

// Mouse wheel zoom
canvas.addEventListener('wheel', e => {
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.2 : 0.833
  // Zoom toward cursor
  const mx = (e.clientX - window.innerWidth/2)  / zoom + centerX
  const my = (e.clientY - window.innerHeight/2) / zoom * -1 + centerY
  zoom *= factor
  zoom = Math.max(50, Math.min(1e12, zoom))
  centerX = mx - (mx - centerX) / factor
  centerY = my - (my - centerY) / factor
}, { passive: false })

// Keyboard
window.addEventListener('keydown', e => {
  const step = 0.1 / zoom * window.innerWidth
  if (e.key === 'ArrowLeft')  centerX -= step
  if (e.key === 'ArrowRight') centerX += step
  if (e.key === 'ArrowUp')    centerY += step
  if (e.key === 'ArrowDown')  centerY -= step
  if (e.key === '+' || e.key === '=') zoom *= 1.5
  if (e.key === '-') zoom = Math.max(50, zoom / 1.5)
  if (e.key === 'j') { params.juliaMode = !params.juliaMode; pane.refresh() }
  if (e.key === 'r') { centerX=-0.5; centerY=0; zoom=200 }
})
