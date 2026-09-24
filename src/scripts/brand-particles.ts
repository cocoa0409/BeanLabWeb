// Original particle system for the approved BEAN LABS artwork and mark.
// Both silhouettes are sampled from our own SVG/font; the shared scene owns time.
type Point = [number, number];
const COUNT = 3000;
const vertexSource = `
  precision highp float;
  attribute vec2 aLogo;
  attribute vec2 aWord;
  attribute vec4 aSeed;
  uniform vec2 uView;
  uniform vec3 uPointer;
  uniform float uTime;
  uniform float uDpr;
  varying float vAlpha;
  float ease(float x) { x=clamp(x,0.,1.); return x*x*x*(x*(x*6.-15.)+10.); }
  float form(float t,float start,float hold,float end,float delay) {
    return ease((t-start-delay)/2.2)*(1.-ease((t-hold-delay)/(end-hold)));
  }
  void main() {
    float mobile=1.-step(761.,uView.x);
    float compact=1.-step(680.,uView.y);
    float phase=mod(uTime,19.3);
    float delay=aSeed.w*.5;
    // Include the final .5s particle stagger when measuring the scattered gaps:
    // .95s before the lockup and 1.75s before the logo, half the previous waits.
    float logo=form(phase,.6,5.6,8.,delay);
    float word=form(phase,9.45,15.25,17.65,delay);
    float formed=logo+word;
    // One shared appearance envelope: stagger affects movement, never color,
    // opacity or dot size. All particles use the same neutral ink below.
    float appearance=form(phase,.6,5.6,8.,.25)+form(phase,9.45,15.25,17.65,.25);
    // Use the central sky, clear of the silver peak on the right. The wider
    // lockup sits slightly higher so it also clears the headline on the left.
    float size=min(uView.x*.20,uView.y*.32);
    float wordWidth=min(uView.x*.60,1000.);
    vec2 center=vec2(uView.x*.5,uView.y*mix(.255,.175,word));
    if(uView.x<=1100.) {
      size=min(size,uView.y*.14);
      center.y=uView.y*.17;
    }
    if(mobile>.5) {
      size=min(uView.x*.52,uView.y*mix(.24,.20,compact));
      wordWidth=uView.x*.90;
      center=vec2(uView.x*.5,uView.y*mix(mix(.76,.78,compact),.84,word));
    }
    if(mobile<.5 && uView.y<=500.) {
      size=uView.y*.12;
      wordWidth=min(wordWidth,uView.y*1.4);
      center.y=uView.y*.78;
    }
    vec2 spread=vec2(uView.x*(.20+.60*aSeed.x),uView.y*(.10+.62*aSeed.y));
    if(mobile>.5) spread=vec2(uView.x*(.04+.92*aSeed.x),uView.y*(mix(.48,.63,compact)+mix(.40,.27,compact)*aSeed.y));
    spread+=vec2(sin(uTime*.33+aSeed.z*24.),cos(uTime*.27+aSeed.w*19.))*vec2(19.,14.);
    // aWord is normalized to its bounding-box width, preserving the font proportions.
    vec2 position=spread*(1.-formed)+(center+aLogo*size)*logo+(center+aWord*wordWidth)*word;
    position+=vec2(sin(uTime*.7+aSeed.z*30.),cos(uTime*.6+aSeed.w*20.))*.8*formed;
    // Depth parallax remains slight so the assembled silhouettes stay legible.
    position+=(uPointer.xy-uView*.5)*.016*(aSeed.z-.5)*uPointer.z;
    vec2 distance=position-uPointer.xy;
    float radius=mix(145.,95.,mobile);
    float influence=max(0.,1.-length(distance)/radius);
    position+=normalize(distance+vec2(.01))*influence*influence*78.*uPointer.z;
    vec2 uv=position/uView;
    float clearCopy=max(smoothstep(.38,.40,uv.x),1.-smoothstep(.235,.25,uv.y));
    if(mobile<.5 && uView.y<=500.) clearCopy=smoothstep(.69,.73,uv.y);
    if(mobile>.5) clearCopy=smoothstep(mix(.43,.58,compact),mix(.49,.64,compact),uv.y);
    float edges=smoothstep(.07,.10,uv.y)*(1.-smoothstep(.90,.98,uv.y));
    vAlpha=(.19+.58*appearance)*clearCopy*edges*smoothstep(0.,.7,uTime);
    gl_Position=vec4(uv.x*2.-1.,1.-uv.y*2.,0.,1.);
    gl_PointSize=(2.2+appearance*.35)*uDpr;
  }
`;
const fragmentSource = `
  precision mediump float;
  varying float vAlpha;
  void main() {
    float radius=length(gl_PointCoord-.5);
    float edge=1.-smoothstep(.28,.5,radius);
    // Fixed #333333 for every particle in every phase; no seeded shade/tint.
    gl_FragColor=vec4(vec3(.2),vAlpha*edge);
  }
`;

function sample(canvas: HTMLCanvasElement, step: number): Point[] {
  const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
  const points: Point[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let y = 0; y < canvas.height; y += step)
    for (let x = 0; x < canvas.width; x += step) {
      if (pixels[(y * canvas.width + x) * 4 + 3] > 160) {
        points.push([x, y]);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  const width = maxX - minX;
  return points.map(([x, y]) => [(x - (minX + maxX) / 2) / width, (y - (minY + maxY) / 2) / width]);
}

export async function loadBrandParticles() {
  const logo = new Image();
  logo.src = '/brand/bean-labs-symbol.svg';
  await Promise.all([logo.decode(), document.fonts.load('128px "Bean Pixel"', 'BEAN LABS')]);
  const mask = document.createElement('canvas');
  mask.width = mask.height = 256;
  mask.getContext('2d')!.drawImage(logo, 0, 0, 256, 256);
  const logoPoints = sample(mask, 4);
  const text = document.createElement('canvas');
  text.width = 768;
  text.height = 180;
  const ctx = text.getContext('2d')!;
  // Match the inline symbol height to the wordmark cap height. This leaves
  // room for a larger, centered lockup between the navigation and headline.
  ctx.drawImage(logo, 12, 42, 96, 96);
  ctx.font = '102px "Bean Pixel"';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000';
  ctx.fillText('BEAN LABS', 130, 90);
  const wordPoints = sample(text, 3);
  if (!logoPoints.length || !wordPoints.length) throw new Error('Brand silhouette unavailable');
  // Seeded shuffling avoids a scan-line wipe and keeps context restoration identical.
  let seed = 7391;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const shuffle = (points: Point[]) => {
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }
  };
  shuffle(logoPoints);
  shuffle(wordPoints);
  const data = new Float32Array(COUNT * 8);
  for (let i = 0; i < COUNT; i++) {
    const a = logoPoints[i % logoPoints.length],
      b = wordPoints[i % wordPoints.length];
    data.set([...a, ...b, random(), random(), random(), random()], i * 8);
  }
  return data;
}

export function createBrandParticles(gl: WebGLRenderingContext, data: Float32Array) {
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram()!;
  const buffer = gl.createBuffer()!;
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const) {
      const shader = gl.createShader(type)!;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error('Particle shader unavailable');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Particle program unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  } catch (error) {
    gl.deleteProgram(program);
    gl.deleteBuffer(buffer);
    throw error;
  } finally {
    shaders.forEach((shader) => gl.deleteShader(shader));
  }
  const logo = gl.getAttribLocation(program, 'aLogo'),
    word = gl.getAttribLocation(program, 'aWord'),
    seed = gl.getAttribLocation(program, 'aSeed');
  const view = gl.getUniformLocation(program, 'uView'),
    pointer = gl.getUniformLocation(program, 'uPointer'),
    time = gl.getUniformLocation(program, 'uTime'),
    dpr = gl.getUniformLocation(program, 'uDpr');
  return {
    draw(
      width: number,
      height: number,
      scale: number,
      seconds: number,
      x: number,
      y: number,
      strength: number,
    ) {
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [location, size, offset] of [
        [logo, 2, 0],
        [word, 2, 8],
        [seed, 4, 16],
      ]) {
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset);
      }
      gl.uniform2f(view, width, height);
      gl.uniform3f(pointer, x, y, strength);
      gl.uniform1f(time, seconds);
      gl.uniform1f(dpr, scale);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.POINTS, 0, width <= 760 ? 1250 : COUNT);
      gl.disable(gl.BLEND);
      [logo, word, seed].forEach((location) => gl.disableVertexAttribArray(location));
    },
    destroy() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
