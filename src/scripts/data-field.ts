import { createBrandParticles, loadBrandParticles } from './brand-particles';
// A persistent 2.5D silver scene, with our own brand silhouettes rendered as particles.
const vertexSource = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * .5 + .5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;
const fragmentSource = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uImage;
  uniform vec2 uView;
  uniform float uTime;
  uniform vec3 uPointer;
  const float TAU = 6.28318530718;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float imageAspect = 1672.0 / 941.0;
    float viewAspect = uView.x / uView.y;
    vec2 cover = vec2(min(1.0, viewAspect / imageAspect), min(1.0, imageAspect / viewAspect));
    // Match CSS object-fit: cover and object-position exactly on the first frame.
    float position = uView.x <= 760.0 ? .62 : .5;
    uv = uv * cover + vec2(position, .5) * (1.0 - cover);
    float cycle = uTime * TAU / 16.0;
    float surface = smoothstep(.24, .88, uv.x) * smoothstep(.08, .68, uv.y);
    float wave = sin(cycle + uv.x * 3.0) - sin(uv.x * 3.0);
    float lift = sin(cycle + uv.y * 2.0) - sin(uv.y * 2.0);
    uv += vec2(wave * .008, lift * .014) * surface;
    vec2 pointer = uPointer.xy / uView - .5;
    uv += pointer * vec2(.010, .008) * surface * uPointer.z;
    vec3 color = texture2D(uImage, uv).rgb;
    float luminance = dot(color, vec3(.2126, .7152, .0722));
    float silver = smoothstep(.025, .24, 1.0 - luminance);
    float sweep = uv.x * 2.4 + uv.y * .65 - .9;
    float reflection = exp(-pow((sweep - .7 * sin(cycle)) * 3.0, 2.0));
    float initial = exp(-pow(sweep * 3.0, 2.0));
    // Light stays on the silver strands; the open background remains still.
    color += (reflection - initial) * silver * .085;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

const mounted = new WeakSet<HTMLElement>();

export function mountDataField() {
  const field = document.querySelector<HTMLElement>('.data-field');
  const canvas = field?.querySelector<HTMLCanvasElement>('.field-canvas');
  const image = field?.querySelector<HTMLImageElement>('.field-fallback');
  const control = document.querySelector<HTMLButtonElement>('.motion-toggle');
  if (!field || !canvas || !image || mounted.has(field)) return;
  mounted.add(field);
  const root = field;
  const surface = canvas;
  const artwork = image;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let timeLocation: WebGLUniformLocation | null = null;
  let viewLocation: WebGLUniformLocation | null = null;
  let pointerLocation: WebGLUniformLocation | null = null;
  let positionLocation = 0;
  let particles: ReturnType<typeof createBrandParticles> | null = null;
  let particleData: Float32Array | null = null;
  let particleLoad: Promise<Float32Array> | null = null;
  let buffer: WebGLBuffer | null = null;
  let textures: WebGLTexture[] = [];
  let frame = 0;
  let frames = 0;
  let last = 0;
  let time = 0;
  let paused = false;
  let lost = false;
  let starting = false;
  let pageHidden = false;
  let width = 0;
  let height = 0;
  let dpr = 1;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, active: false };
  const status = () => {
    root.dataset.motion = reduced.matches
      ? 'reduced'
      : lost || !program
        ? 'static'
        : paused
          ? 'paused'
          : 'playing';
    if (control) {
      control.hidden = !program || lost || reduced.matches;
      control.setAttribute('aria-pressed', String(paused));
      control.setAttribute('aria-label', paused ? 'Resume animation' : 'Pause animation');
      control.title = paused ? 'Resume animation' : 'Pause animation';
    }
  };
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function release() {
    if (!gl) return;
    particles?.destroy();
    particles = null;
    textures.forEach((texture) => gl!.deleteTexture(texture));
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    textures = [];
    program = null;
    buffer = null;
  }
  function compile(kind: number, source: string) {
    const shader = gl!.createShader(kind)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      gl!.deleteShader(shader);
      throw new Error('Artwork shader unavailable');
    }
    return shader;
  }
  function texture(source: TexImageSource, unit: number, name: string) {
    const item = gl!.createTexture()!;
    textures.push(item);
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, item);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, source);
    gl!.uniform1i(gl!.getUniformLocation(program!, name), unit);
  }
  async function initialize() {
    if (starting || program || lost || reduced.matches) return;
    starting = true;
    try {
      await artwork.decode();
      // Particle assets are local and sampled once. A failed extra asset must not
      // prevent the approved silver background from rendering.
      if (!particleData) {
        particleLoad ??= loadBrandParticles();
        try {
          particleData = await particleLoad;
        } catch {
          particleLoad = null;
        }
      }
      if (reduced.matches || lost) return;
      gl = surface.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: 'low-power',
      });
      if (!gl) return;
      const vertex = compile(gl.VERTEX_SHADER, vertexSource);
      const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram()!;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error('Artwork program unavailable');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      positionLocation = gl.getAttribLocation(program, 'aPosition');
      texture(artwork, 0, 'uImage');
      timeLocation = gl.getUniformLocation(program, 'uTime');
      viewLocation = gl.getUniformLocation(program, 'uView');
      pointerLocation = gl.getUniformLocation(program, 'uPointer');
      if (particleData) {
        try {
          particles = createBrandParticles(gl, particleData);
        } catch {
          particles = null;
        }
      }
      root.dataset.particles = particles ? 'ready' : 'unavailable';
      resize();
      schedule(true);
    } catch {
      release();
      root.classList.remove('field-ready');
    } finally {
      starting = false;
      status();
    }
  }
  function render(timestamp: number) {
    frame = 0;
    if (!gl || !program || lost || document.hidden || pageHidden) return;
    const interval = width <= 760 ? 1000 / 30 : 1000 / 60;
    if (last && timestamp - last < interval - 1 && !paused && !reduced.matches) {
      frame = requestAnimationFrame(render);
      return;
    }
    const delta = last ? Math.min((timestamp - last) / 1000, 0.12) : 0;
    last = timestamp;
    if (!paused && !reduced.matches) {
      time += delta;
      const home = document.documentElement.dataset.layout === 'immersive';
      const active = pointer.active && home && finePointer.matches;
      const ease = 1 - Math.exp(-delta * 8);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      pointer.strength += ((active ? 1 : 0) - pointer.strength) * ease;
    }
    gl.viewport(0, 0, surface.width, surface.height);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(viewLocation, width, height);
    gl.uniform1f(timeLocation, time);
    gl.uniform3f(pointerLocation, pointer.x, pointer.y, pointer.strength);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(positionLocation);
    particles?.draw(width, height, dpr, time, pointer.x, pointer.y, pointer.strength);
    root.classList.add('field-ready');
    root.dataset.frame = String(++frames);
    status();
    if (!paused && !reduced.matches) frame = requestAnimationFrame(render);
  }
  function schedule(force = false) {
    if (
      !frame &&
      program &&
      !lost &&
      !document.hidden &&
      !pageHidden &&
      (force || (!paused && !reduced.matches))
    )
      frame = requestAnimationFrame(render);
  }
  function resize() {
    const rect = root.getBoundingClientRect();
    const nextDpr = Math.min(devicePixelRatio || 1, 1.75);
    if (width === rect.width && height === rect.height && nextDpr === dpr) return;
    width = rect.width;
    height = rect.height;
    dpr = nextDpr;
    surface.width = Math.round(width * dpr);
    surface.height = Math.round(height * dpr);
    schedule(true);
  }
  control?.addEventListener('click', () => {
    paused = !paused;
    stop();
    status();
    schedule();
  });
  addEventListener(
    'pointermove',
    (event) => {
      if (
        event.pointerType === 'touch' ||
        !finePointer.matches ||
        paused ||
        reduced.matches ||
        document.documentElement.dataset.layout !== 'immersive'
      )
        return;
      if (!pointer.active && pointer.strength < 0.01) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.active = true;
    },
    { passive: true },
  );
  const clearPointer = () => {
    pointer.active = false;
  };
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) clearPointer();
  });
  document.addEventListener('astro:after-swap', clearPointer);
  addEventListener('blur', clearPointer);
  document.addEventListener('visibilitychange', () => {
    clearPointer();
    stop();
    if (!document.hidden) schedule();
  });
  reduced.addEventListener('change', () => {
    stop();
    status();
    if (!reduced.matches) program ? schedule() : void initialize();
  });
  surface.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    stop();
    release();
    root.classList.remove('field-ready');
    status();
  });
  surface.addEventListener('webglcontextrestored', () => {
    lost = false;
    void initialize();
  });
  addEventListener('pagehide', () => {
    pageHidden = true;
    stop();
  });
  addEventListener('pageshow', () => {
    pageHidden = false;
    schedule();
  });
  new ResizeObserver(resize).observe(root);
  resize();
  status();
  void initialize();
}
