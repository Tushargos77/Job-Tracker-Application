import { useEffect, useRef } from "react";
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  NearestFilter,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
} from "three";
import { generateWorld, mulberry32 } from "./voxelWorld";

/* ---------- Palette ---------- */
const SKY = "#f0dcab"; // horizon colour, also used for fog so distance melts away

/* ---------- 16x16 pixel textures drawn in code (original artwork) ---------- */
function pixelTexture(seed, draw) {
  const rand = mulberry32(seed);
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const [r, g, b, a = 255] = draw(x, y, rand);
      const i = (y * 16 + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.magFilter = NearestFilter;
  tex.anisotropy = 4;
  return tex;
}

const jitter = (rand, amount) => (rand() - 0.5) * 2 * amount;
const shade = ([r, g, b], v) => [r + v, g + v, b + v];

function buildTextures() {
  const DIRT = [121, 85, 58];
  const GRASS = [90, 178, 52];

  const grassTop = pixelTexture(1, (x, y, rand) => shade(GRASS, jitter(rand, 16)));

  let edge = null;
  const grassSide = pixelTexture(2, (x, y, rand) => {
    if (!edge) edge = Array.from({ length: 16 }, () => 3 + (rand() < 0.45 ? 1 : 0) + (rand() < 0.15 ? 1 : 0));
    return y < edge[x] ? shade(GRASS, jitter(rand, 14)) : shade(DIRT, jitter(rand, 12));
  });

  const dirt = pixelTexture(3, (x, y, rand) => shade(DIRT, jitter(rand, 14) - (rand() < 0.08 ? 22 : 0)));
  const sand = pixelTexture(4, (x, y, rand) => shade([236, 212, 140], jitter(rand, 8)));
  const stone = pixelTexture(5, (x, y, rand) => shade([126, 128, 128], jitter(rand, 14) - (rand() < 0.1 ? 26 : 0)));

  const logSide = pixelTexture(6, (x, y, rand) => shade([104, 79, 46], (x % 4 === 0 ? -16 : 0) + jitter(rand, 6)));
  const logTop = pixelTexture(7, (x, y, rand) => {
    const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    const v = Math.floor(ring) % 2 === 0 ? 0 : -14;
    return shade([166, 132, 82], v + jitter(rand, 5));
  });

  const leaves = pixelTexture(8, (x, y, rand) => {
    if (rand() < 0.14) return [0, 0, 0, 0];
    return shade([46, 150, 58], jitter(rand, 26));
  });

  const water = pixelTexture(9, (x, y, rand) => shade([48, 172, 192], jitter(rand, 8) + (rand() < 0.06 ? 24 : 0)));
  water.wrapS = water.wrapT = RepeatWrapping;

  return { grassTop, grassSide, dirt, sand, stone, logSide, logTop, leaves, water };
}

/* ---------- Scene ---------- */
export default function VoxelScene({ onReady }) {
  const hostRef = useRef(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (err) {
      console.warn("WebGL unavailable, showing static background.", err);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.domElement.className = "vx-canvas";
    host.appendChild(renderer.domElement);

    const scene = new Scene();
    scene.background = new Color(SKY);
    scene.fog = new Fog(SKY, 40, 110);

    const camera = new PerspectiveCamera(45, 1, 0.5, 400);

    /* Lights: warm low sun + soft sky light */
    scene.add(new HemisphereLight("#bfe4ff", "#6a7d3a", 1.1));
    const sun = new DirectionalLight("#ffd9a0", 3.4);
    sun.position.set(32, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34;
    sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 130;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);

    /* World */
    const world = generateWorld();
    const tex = buildTextures();
    const lambert = (map, extra = {}) => new MeshLambertMaterial({ map, ...extra });

    const m = {
      grassTop: lambert(tex.grassTop),
      grassSide: lambert(tex.grassSide),
      dirt: lambert(tex.dirt),
      sand: lambert(tex.sand),
      stone: lambert(tex.stone),
      logSide: lambert(tex.logSide),
      logTop: lambert(tex.logTop),
      leaves: lambert(tex.leaves, { alphaTest: 0.5 }),
    };

    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const materialsByType = {
      grass: [m.grassSide, m.grassSide, m.grassTop, m.dirt, m.grassSide, m.grassSide],
      dirt: m.dirt,
      sand: m.sand,
      stone: m.stone,
      log: [m.logSide, m.logSide, m.logTop, m.logTop, m.logSide, m.logSide],
      leaves: m.leaves,
    };

    const blockGeometry = new BoxGeometry(1, 1, 1);
    const matrix = new Matrix4();
    const color = new Color();
    const terrain = new Group();

    Object.entries(world.blocks).forEach(([type, list]) => {
      if (!list.length) return;
      const mesh = new InstancedMesh(blockGeometry, materialsByType[type], list.length);
      list.forEach((b, i) => {
        matrix.makeTranslation(b.x, b.y, b.z);
        mesh.setMatrixAt(i, matrix);
        color.setRGB(b.tint[0], b.tint[1], b.tint[2]);
        mesh.setColorAt(i, color);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      terrain.add(mesh);
    });
    scene.add(terrain);

    /* Sea floor beyond the generated area, then the water surface */
    const seabedGeometry = new PlaneGeometry(700, 700);
    seabedGeometry.rotateX(-Math.PI / 2);
    const seabed = new Mesh(seabedGeometry, new MeshLambertMaterial({ color: "#e0cf94" }));
    seabed.position.y = 1.44;
    scene.add(seabed);

    tex.water.repeat.set(700 / 8, 700 / 8);
    const waterGeometry = new PlaneGeometry(700, 700);
    waterGeometry.rotateX(-Math.PI / 2);
    const waterMaterial = new MeshLambertMaterial({
      map: tex.water,
      color: "#5fd0cf",
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const water = new Mesh(waterGeometry, waterMaterial);
    water.position.y = world.waterLevel + 0.5 - 0.14;
    water.receiveShadow = true;
    scene.add(water);

    /* Clouds */
    const cloudMaterial = new MeshBasicMaterial({ color: "#ffffff" });
    const cloudGroup = new Group();
    const clouds = world.clouds.map((c) => {
      const g = new Group();
      c.parts.forEach((p) => {
        const part = new Mesh(blockGeometry, cloudMaterial);
        part.scale.set(p.sx, 1.4, p.sz);
        part.position.set(p.dx, 0, p.dz);
        g.add(part);
      });
      g.position.set(c.x, c.y, c.z);
      cloudGroup.add(g);
      return { g, speed: c.speed };
    });
    scene.add(cloudGroup);

    /* Fireflies */
    const fireflyPositions = new Float32Array(world.fireflies.length * 3);
    const fireflyGeometry = new BufferGeometry();
    fireflyGeometry.setAttribute("position", new BufferAttribute(fireflyPositions, 3));
    const fireflyMaterial = new PointsMaterial({
      color: "#f6f2a0",
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const fireflies = new Points(fireflyGeometry, fireflyMaterial);
    fireflies.frustumCulled = false;
    scene.add(fireflies);

    const updateFireflies = (t) => {
      world.fireflies.forEach((f, i) => {
        fireflyPositions[i * 3] = f.x + Math.sin(t * 0.5 + f.phase) * 1.2;
        fireflyPositions[i * 3 + 1] = f.y + Math.sin(t * 0.8 + f.phase * 2) * 0.6;
        fireflyPositions[i * 3 + 2] = f.z + Math.cos(t * 0.45 + f.phase) * 1.2;
      });
      fireflyGeometry.attributes.position.needsUpdate = true;
    };

    /* Camera drifts in a slow arc around the island so the edges never show */
    const RADIUS = 30;
    const HEIGHT = 10;
    const placeCamera = (t) => {
      const a = -0.4 + Math.sin(t * 0.045) * 0.55;
      camera.position.set(Math.sin(a) * RADIUS, HEIGHT + Math.sin(t * 0.3) * 0.25, Math.cos(a) * RADIUS);
      camera.lookAt(0, 4.2, 0);
    };

    const renderFrame = (t) => {
      tex.water.offset.set(t * 0.004, t * 0.0025);
      placeCamera(t);
      updateFireflies(t);
      renderer.render(scene, camera);
    };

    /* Loop state */
    let raf = 0;
    let started = false;
    let lastT = 6;
    let prev = 0;
    let announced = false;

    /* Sizing */
    let sized = false;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      sized = true;
      if (reduceMotion || !raf) renderFrame(reduceMotion ? 6 : lastT);
    };

    /* Loop */
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = prev ? Math.min((now - prev) / 1000, 0.1) : 0;
      prev = now;
      lastT += dt;
      clouds.forEach((c) => {
        c.g.position.x += c.speed * dt;
        if (c.g.position.x > 85) c.g.position.x = -85;
      });
      renderFrame(lastT);
      if (!announced) {
        announced = true;
        onReadyRef.current?.();
      }
    };

    const start = () => {
      if (reduceMotion || raf || !sized) return;
      prev = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (sized && !started) {
        started = true;
        if (reduceMotion) {
          renderFrame(6);
          onReadyRef.current?.();
        } else {
          start();
        }
      }
    });
    resizeObserver.observe(host);
    const sizeCheck = window.setTimeout(() => {
      if (!sized) {
        console.warn(
          "VoxelScene: its container has no size. Give the left column a height (for example min-height: 100vh on the parent)."
        );
      }
    }, 1500);

    let inView = true;
    const intersection = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !document.hidden) start();
      else stop();
    });
    intersection.observe(host);

    const onVisibility = () => (document.hidden ? stop() : inView && start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.clearTimeout(sizeCheck);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
      });
      [...Object.values(m), waterMaterial, cloudMaterial, fireflyMaterial, seabed.material].forEach((mat) =>
        mat.dispose()
      );
      Object.values(tex).forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="vx-scene" aria-hidden="true" />;
}

