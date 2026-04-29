export function createGL(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'high-performance', ...opts })
  if (!gl) throw new Error('WebGL not supported')
  return gl
}

export function compileShader(gl, type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error(`Shader compile error:\n${err}`)
  }
  return s
}

export function compileProgram(gl, vs, fs) {
  const prog = gl.createProgram()
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(`Program link error:\n${gl.getProgramInfoLog(prog)}`)
  return prog
}

export function createQuad(gl) {
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
  return buf
}

export function bindQuad(gl, prog, buf) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  const loc = gl.getAttribLocation(prog, 'a_pos')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
}

export function setUniforms(gl, prog, uniforms) {
  for (const [name, val] of Object.entries(uniforms)) {
    const loc = gl.getUniformLocation(prog, name)
    if (loc === null) continue
    if (typeof val === 'number') gl.uniform1f(loc, val)
    else if (typeof val === 'boolean') gl.uniform1i(loc, val ? 1 : 0)
    else if (Number.isInteger(val) || val?._int) gl.uniform1i(loc, val._int ?? val)
    else if (Array.isArray(val) && val.length === 2) gl.uniform2f(loc, val[0], val[1])
    else if (Array.isArray(val) && val.length === 3) gl.uniform3f(loc, val[0], val[1], val[2])
    else if (Array.isArray(val) && val.length === 4) gl.uniform4f(loc, val[0], val[1], val[2], val[3])
  }
}

export function resize(gl, canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.floor(window.innerWidth * dpr)
  const h = Math.floor(window.innerHeight * dpr)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h
    gl.viewport(0, 0, w, h)
    return true
  }
  return false
}

export function create1DTexture(gl, unit, width) {
  gl.activeTexture(gl.TEXTURE0 + unit)
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const data = new Uint8Array(width).fill(0)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, data)
  return {
    tex,
    update(newData) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, newData)
    }
  }
}
