const VERT_SRC = `
  attribute vec2 aPos;
  varying vec2 vUv;

  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;

  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;
    uv.x *= aspect;

    float t = uTime * 0.18;

    vec2 p1 = vec2(
      0.5 * aspect + 0.35 * sin(t * 0.7 + 1.0),
      0.5 + 0.3 * cos(t * 0.9)
    );
    vec2 p2 = vec2(
      0.5 * aspect + 0.3 * cos(t * 0.6 + 2.5),
      0.5 + 0.35 * sin(t * 0.8 + 0.8)
    );
    vec2 p3 = vec2(
      0.5 * aspect + 0.25 * sin(t * 0.5 + 4.0),
      0.5 + 0.25 * cos(t * 1.1 + 1.5)
    );

    float d1 = 0.28 / (length(uv - p1) + 0.15);
    float d2 = 0.24 / (length(uv - p2) + 0.18);
    float d3 = 0.22 / (length(uv - p3) + 0.20);

    vec3 c1 = vec3(0.34, 0.30, 0.92) * d1;
    vec3 c2 = vec3(0.18, 0.72, 0.76) * d2;
    vec3 c3 = vec3(0.85, 0.42, 0.56) * d3;

    vec3 col = c1 + c2 + c3;
    col = col / (1.0 + col);

    float vig = 1.0 - 0.35 * length(vUv - 0.5);
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default class AuroraField {
  constructor() {
    this._gl = null;
    this._prog = null;
    this._raf = 0;
    this._start = 0;
    this._canvas = null;
    this._observer = null;
    this._visible = true;
    this._onResize = this._handleResize.bind(this);
  }

  mount(canvas) {
    this._canvas = canvas;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) {
      console.warn("WebGL not available — aurora won't render.");
      return;
    }
    this._gl = gl;

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vert || !frag) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("Program link error:", gl.getProgramInfoLog(prog));
      return;
    }
    this._prog = prog;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    this._uTime = gl.getUniformLocation(prog, "uTime");
    this._uRes = gl.getUniformLocation(prog, "uRes");

    this._observer = new IntersectionObserver(
      ([entry]) => { this._visible = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    this._observer.observe(canvas);

    this._handleResize();
    window.addEventListener("resize", this._onResize);
    this._start = performance.now();
    this._tick();
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    this._gl = null;
  }

  _handleResize() {
    const c = this._canvas;
    if (!c) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth * dpr;
    const h = c.clientHeight * dpr;

    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      this._gl?.viewport(0, 0, w, h);
    }
  }

  _tick() {
    this._raf = requestAnimationFrame(() => this._tick());

    if (!this._visible || !this._gl) return;

    const gl = this._gl;
    const elapsed = (performance.now() - this._start) / 1000;

    gl.uniform1f(this._uTime, elapsed);
    gl.uniform2f(this._uRes, this._canvas.width, this._canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
