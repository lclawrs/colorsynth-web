export const VS_QUAD = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.,1.);}`

export const COMPLEX_MATH = `
precision highp float;
vec2 cmul(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
vec2 cdiv(vec2 a,vec2 b){float d=dot(b,b)+1e-10;return vec2((a.x*b.x+a.y*b.y)/d,(a.y*b.x-a.x*b.y)/d);}
vec2 cexp(vec2 z){return exp(z.x)*vec2(cos(z.y),sin(z.y));}
float cabs(vec2 z){return length(z);}
float cangle(vec2 z){return atan(z.y,z.x);}
vec2 csin(vec2 z){float ep=exp(z.y),em=exp(-z.y);return vec2(sin(z.x)*(ep+em)*.5,cos(z.x)*(ep-em)*.5);}
vec2 ccos(vec2 z){float ep=exp(z.y),em=exp(-z.y);return vec2(cos(z.x)*(ep+em)*.5,-sin(z.x)*(ep-em)*.5);}
vec2 clog(vec2 z){return vec2(log(length(z)+1e-10),atan(z.y,z.x));}
`

// Double-single precision emulation (for deep Mandelbrot zoom)
export const DS_MATH = `
// Knuth two-sum: represents high-precision float as vec2(hi, lo)
vec2 ds_set(float a){ return vec2(a, 0.0); }
vec2 ds_add(vec2 a, vec2 b){
  float s = a.x + b.x;
  float v = s - a.x;
  float e = (a.x - (s-v)) + (b.x - v) + a.y + b.y;
  return vec2(s, e);
}
vec2 ds_mul(vec2 a, vec2 b){
  // Split a.x into two 12-bit halves (no fma() in WebGL1)
  float c = (8193.0 + 1.0) * a.x;
  float ahi = c - (c - a.x);
  float alo = a.x - ahi;
  float c2 = (8193.0 + 1.0) * b.x;
  float bhi = c2 - (c2 - b.x);
  float blo = b.x - bhi;
  float p = a.x * b.x;
  float e = ((ahi*bhi - p) + ahi*blo + alo*bhi) + alo*blo;
  return vec2(p, e + a.x*b.y + a.y*b.x);
}
float ds_val(vec2 a){ return a.x + a.y; }
`
