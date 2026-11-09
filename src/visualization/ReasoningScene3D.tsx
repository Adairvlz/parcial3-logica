import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Maximize, RotateCw } from "lucide-react";
import type { Evidence } from "../core/types";
import type { ReasoningFrame } from "../reasoning/playback";
import { pathToNode, type VisibleTree } from "../reasoning/tree";
import { coneLayout, type Point3 } from "./coneLayout";

const KIND_COLORS: Record<string, number> = {
  universal: 0xa78bfa,
  existential: 0x60a5fa,
  connective: 0x8fb4e8,
  predicate: 0x5eead4,
};
const TRUE = 0x74f5c9;
const FALSE = 0xfb7185;
const RUNNING = 0xfbbf24;
const NEUTRAL = 0x69bfe8;
const familyOf = (kind: Evidence["kind"]) =>
  kind === "forall"
    ? "universal"
    : kind === "exists"
      ? "existential"
      : kind === "predicate" || kind === "equals"
        ? "predicate"
        : "connective";
const radiusOf = (family: string) =>
  family === "universal" ? 0.78 : family === "existential" ? 0.62 : 0.5;
const KIND_NAMES: Record<Evidence["kind"], string> = {
  forall: "UNIVERSAL",
  exists: "EXISTENCIAL",
  predicate: "PREDICADO",
  equals: "IGUALDAD",
  not: "NEGACIÓN",
  and: "CONJUNCIÓN",
  or: "DISYUNCIÓN",
  implies: "IMPLICACIÓN",
  iff: "BICONDICIONAL",
};
const TUBE_SEGMENTS = 48;
/** Screen space taken by the formula dock and the timeline, as in the 2D view. */
const docks = (clear: boolean) =>
  clear ? { top: 40, bottom: 40 } : { top: 110, bottom: 215 };
const TUBE_SIDES = 8;

/** Text drawn on a canvas and shown as a sprite that always faces the camera. */
function textSprite(
  lines: { text: string; color: string; size: number; weight?: number }[],
  width: number,
  height: number,
  scale: number,
  /** Shared textures for repeated text, such as symbols and assignments. */
  cache?: Map<string, THREE.CanvasTexture>,
) {
  const key = JSON.stringify([lines, width, height]);
  const cached = cache?.get(key);
  const sprite = (texture: THREE.CanvasTexture) => {
    const result = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      }),
    );
    result.scale.set(scale, (scale * height) / width, 1);
    return result;
  };
  if (cached) return sprite(cached);
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const total = lines.reduce((sum, l) => sum + l.size * 1.25, 0);
  let y = height / 2 - total / 2;
  for (const line of lines) {
    y += (line.size * 1.25) / 2;
    ctx.font = `${line.weight ?? 500} ${line.size}px "JetBrains Mono", Consolas, monospace`;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 8;
    ctx.fillStyle = line.color;
    let text = line.text;
    while (text.length > 4 && ctx.measureText(text).width > width - 16)
      text = `${text.slice(0, -2)}…`;
    ctx.fillText(text, width / 2, y);
    y += (line.size * 1.25) / 2;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Text is always seen near its drawn size: mipmaps would only cost memory.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  if (cache) {
    texture.userData.shared = true;
    cache.set(key, texture);
  }
  return sprite(texture);
}

/** Soft radial glow, tinted per use; additive blending stands in for bloom. */
function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
const glow = (texture: THREE.Texture, color: number, size: number) => {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sprite.scale.setScalar(size);
  return sprite;
};

interface NodeObjects {
  group: THREE.Group;
  sphere: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  halo: THREE.Sprite;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  roleRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  label: THREE.Sprite;
  labelKey: string;
  radius: number;
}
interface EdgeObjects {
  tube: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  curve: THREE.CubicBezierCurve3;
  pulse: THREE.Group;
  label: THREE.Sprite | null;
}
interface World {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  glow: THREE.Texture;
  textures: Map<string, THREE.CanvasTexture>;
  content: THREE.Group;
  nodes: Map<string, NodeObjects>;
  edges: Map<string, EdgeObjects>;
}

function disposeTree(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = (mesh as { material?: THREE.Material }).material;
    if (material) {
      const map = (material as THREE.SpriteMaterial).map;
      if (map && !map.userData.shared) map.dispose();
      material.dispose();
    }
  });
}

function labelFor(
  label: string,
  family: string,
  kind: Evidence["kind"],
  role: string,
) {
  const tag =
    role === "witness"
      ? "TESTIGO"
      : role === "counterexample"
        ? "CONTRAEJEMPLO"
        : KIND_NAMES[kind];
  const tagColor =
    role === "witness" ? "#74f5c9" : role === "counterexample" ? "#fb7185" : "#8ba0b9";
  return textSprite(
    [
      { text: tag, color: tagColor, size: 15, weight: 600 },
      {
        text: label,
        color: family === "universal" ? "#f1f5f9" : "#dce7f3",
        size: 26,
      },
    ],
    360,
    80,
    4.4,
  );
}

interface SceneProps {
  tree: VisibleTree;
  frame: ReasoningFrame;
  selectedId: string;
  onSelect: (id: string) => void;
  reduced: boolean;
  visible: boolean;
  /** The formula dock and timeline are hidden. */
  clear?: boolean;
}
type Failure = { reason: "create" | "lost"; detail: string } | null;

/** Each retry mounts a fresh renderer, since a lost WebGL context is gone. */
export default function ReasoningScene3D(props: SceneProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <Scene3D
      key={attempt}
      {...props}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}

/** Same reasoning as the 2D tree, as a cone of spheres the viewer can orbit. */
function Scene3D({
  tree,
  frame,
  selectedId,
  onSelect,
  reduced,
  visible,
  clear = false,
  onRetry,
}: SceneProps & { onRetry: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const [failed, setFailed] = useState<Failure>(null);
  const [spinning, setSpinning] = useState(!reduced);
  const positions = useMemo(() => coneLayout(tree.nodes), [tree]);
  const path = useMemo(() => pathToNode(tree, selectedId), [tree, selectedId]);
  const clearRef = useRef(clear);
  clearRef.current = clear;

  /** Centres the picture in the space the docks leave free. */
  const offsetView = () => {
    const w = world.current;
    const element = host.current;
    if (!w || !element) return 1;
    const { clientWidth: width, clientHeight: height } = element;
    if (!width || !height) return 1;
    const { top, bottom } = docks(clearRef.current);
    w.camera.setViewOffset(width, height, 0, (bottom - top) / 2, width, height);
    // Vertical room left between the docks, in normalized device coordinates.
    return 1 - (top + bottom) / height;
  };

  /**
   * Moves the camera back until every sphere and its label fits in the free
   * space, found by bisection on the projected points.
   */
  const fit = () => {
    const w = world.current;
    if (!w) return;
    const points = Object.values(positions).flatMap((p) => [
      new THREE.Vector3(p.x, p.y + 1, p.z),
      new THREE.Vector3(p.x, p.y - 2.2, p.z),
    ]);
    const center = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
    const room = offsetView();
    const direction = new THREE.Vector3(0.55, 0.42, 1).normalize();
    const place = (distance: number) => {
      w.camera.position.copy(center).addScaledVector(direction, distance);
      w.camera.lookAt(center);
      w.camera.updateMatrixWorld();
    };
    const fits = (distance: number) => {
      place(distance);
      return points.every((point) => {
        const v = point.clone().project(w.camera);
        return v.z < 1 && Math.abs(v.x) < 0.9 && Math.abs(v.y) < room * 0.92;
      });
    };
    w.camera.near = 0.1;
    w.camera.far = 1000;
    w.camera.updateProjectionMatrix();
    let near = 2;
    let far = 300;
    for (let i = 0; i < 30; i++) {
      const middle = (near + far) / 2;
      if (fits(middle)) far = middle;
      else near = middle;
    }
    place(far);
    w.controls.target.copy(center);
    w.controls.update();
  };

  // Renderer, camera, controls and the ambient scene live as long as the view.
  useEffect(() => {
    const element = host.current!;
    // Low on video memory, a context without antialiasing may still fit.
    const attempts: THREE.WebGLRendererParameters[] = [
      { antialias: true, alpha: true },
      { antialias: false, alpha: true, powerPreference: "low-power" },
    ];
    let renderer: THREE.WebGLRenderer | null = null;
    let lastError: unknown = null;
    for (const options of attempts) {
      try {
        renderer = new THREE.WebGLRenderer(options);
        break;
      } catch (error) {
        lastError = error;
        console.warn("LOGOS 3D: no se pudo crear el contexto WebGL.", options, error);
      }
    }
    if (!renderer) {
      const detail =
        lastError instanceof Error ? lastError.message : String(lastError);
      setFailed({ reason: "create", detail });
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050912, 0.012);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 0.7;
    scene.add(new THREE.AmbientLight(0x9fb4cc, 0.55));
    const key = new THREE.PointLight(0xc4b5fd, 60, 0, 1.6);
    key.position.set(6, 10, 8);
    const fill = new THREE.PointLight(0x5eead4, 35, 0, 1.6);
    fill.position.set(-8, -6, -6);
    scene.add(key, fill);
    const stars = new THREE.BufferGeometry();
    const coordinates: number[] = [];
    for (let i = 0; i < 700; i++) {
      // Deterministic spread, so screenshots and tests are stable.
      const u = ((i * 0.618034) % 1) * 2 - 1;
      const theta = i * 2.39996;
      const r = 60 + ((i * 37) % 60);
      const s = Math.sqrt(1 - u * u);
      coordinates.push(r * s * Math.cos(theta), r * u, r * s * Math.sin(theta));
    }
    stars.setAttribute("position", new THREE.Float32BufferAttribute(coordinates, 3));
    scene.add(
      new THREE.Points(
        stars,
        new THREE.PointsMaterial({
          color: 0x9fb4cc,
          size: 0.35,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      ),
    );
    const content = new THREE.Group();
    scene.add(content);
    world.current = {
      renderer,
      scene,
      camera,
      controls,
      glow: glowTexture(),
      textures: new Map(),
      content,
      nodes: new Map(),
      edges: new Map(),
    };
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = element;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      offsetView();
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const stop = () => setSpinning(false);
    controls.addEventListener("start", stop);
    // Out of video memory the browser drops the context: say so, never go blank.
    const lost = (event: Event) => {
      event.preventDefault();
      console.warn("LOGOS 3D: el navegador perdió el contexto WebGL.", event);
      setFailed({
        reason: "lost",
        detail: "El navegador retiró el contexto WebGL (webglcontextlost).",
      });
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      controls.removeEventListener("start", stop);
      observer.disconnect();
      controls.dispose();
      disposeTree(scene);
      world.current?.glow.dispose();
      world.current?.textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      world.current = null;
    };
  }, []);

  // The render loop runs only while the view is on screen.
  useEffect(() => {
    const w = world.current;
    if (!w || !visible) return;
    let raf = 0;
    const loop = () => {
      w.controls.update();
      w.renderer.render(w.scene, w.camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, failed]);

  useEffect(() => {
    if (world.current) world.current.controls.autoRotate = spinning && !reduced;
  }, [spinning, reduced]);

  // Hiding the docks frees space: reframe into it.
  useEffect(() => {
    fit();
  }, [clear]);

  // Scene graph: rebuilt whenever branches open or fold.
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    disposeTree(w.content);
    w.content.clear();
    w.nodes.clear();
    w.edges.clear();
    const at = (p: Point3) => new THREE.Vector3(p.x, p.y, p.z);
    for (const n of tree.nodes) {
      const family = familyOf(n.evidence.kind);
      const color = KIND_COLORS[family];
      const radius = radiusOf(family);
      const group = new THREE.Group();
      group.position.copy(at(positions[n.id]));
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 40, 24),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.35,
          roughness: 0.25,
          metalness: 0.15,
          transparent: true,
          opacity: 0.88,
        }),
      );
      sphere.userData.id = n.id;
      const symbol = textSprite(
        [{ text: n.symbol, color: "#ffffff", size: 74, weight: 500 }],
        128,
        128,
        radius * 1.35,
        w.textures,
      );
      symbol.material.depthTest = false;
      symbol.renderOrder = 2;
      const halo = glow(w.glow, color, radius * 4.2);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.32, 0.035, 10, 72),
        new THREE.MeshBasicMaterial({ color: NEUTRAL, transparent: true }),
      );
      ring.rotation.x = Math.PI / 2.4;
      const roleRing = new THREE.Mesh(
        new THREE.TorusGeometry(radius * 1.65, 0.05, 10, 72),
        new THREE.MeshBasicMaterial({ color: TRUE, transparent: true }),
      );
      roleRing.rotation.set(Math.PI / 3, Math.PI / 5, 0);
      const label = labelFor(n.label, family, n.evidence.kind, "");
      label.position.y = -radius - 0.75;
      group.add(halo, sphere, symbol, ring, roleRing, label);
      w.content.add(group);
      w.nodes.set(n.id, {
        group,
        sphere,
        halo,
        ring,
        roleRing,
        label,
        labelKey: "",
        radius,
      });
      if (!n.parentId) continue;
      const from = at(positions[n.parentId]);
      const to = at(positions[n.id]);
      const drop = (from.y - to.y) * 0.55;
      const curve = new THREE.CubicBezierCurve3(
        from,
        from.clone().add(new THREE.Vector3(0, -drop, 0)),
        to.clone().add(new THREE.Vector3(0, drop, 0)),
        to,
      );
      const parentFamily = familyOf(tree.byId.get(n.parentId)!.evidence.kind);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, TUBE_SEGMENTS, 0.045, TUBE_SIDES),
        new THREE.MeshBasicMaterial({
          color: KIND_COLORS[parentFamily],
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      const pulse = new THREE.Group();
      pulse.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 16, 12),
          new THREE.MeshBasicMaterial({ color: 0xeffffc }),
        ),
        glow(w.glow, 0x9bd6ff, 1.3),
      );
      let edgeLabel: THREE.Sprite | null = null;
      if (n.edgeLabel) {
        edgeLabel = textSprite(
          [{ text: n.edgeLabel, color: "#e2ecf8", size: 24, weight: 600 }],
          200,
          44,
          2.3,
          w.textures,
        );
        edgeLabel.position.copy(curve.getPoint(0.5));
        w.content.add(edgeLabel);
      }
      w.content.add(tube, pulse);
      w.edges.set(n.id, { tube, curve, pulse, label: edgeLabel });
    }
    fit();
    setSpinning(!reduced);
  }, [tree, positions]);

  // Per-frame state: the same frame drives the 2D tree.
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    for (const n of tree.nodes) {
      const objects = w.nodes.get(n.id);
      const nf = frame.nodes[n.id];
      if (!objects || !nf) continue;
      const shown = nf.appearance > 0.02;
      objects.group.visible = shown;
      const selected = n.id === selectedId;
      const dimmed = !!selectedId && !path.includes(n.id);
      objects.group.scale.setScalar(
        Math.max(0.001, nf.appearance) * (selected ? 1.18 : 1),
      );
      const resolved = nf.state === "true" || nf.state === "false";
      objects.ring.visible = nf.state !== "pending";
      objects.ring.material.color.setHex(
        nf.state === "running" ? RUNNING : nf.state === "true" ? TRUE : FALSE,
      );
      objects.ring.material.opacity = dimmed ? 0.25 : 0.95;
      const role = resolved && n.role ? n.role : "";
      objects.roleRing.visible = !!role;
      objects.roleRing.material.color.setHex(role === "witness" ? TRUE : FALSE);
      objects.sphere.material.opacity = dimmed ? 0.3 : 0.88;
      objects.sphere.material.emissiveIntensity = selected ? 0.7 : 0.35;
      // A false node glows coral once resolved; the kind still names its color.
      objects.sphere.material.emissive.setHex(
        resolved && !n.evidence.value
          ? 0x7f1d2d
          : KIND_COLORS[familyOf(n.evidence.kind)],
      );
      const burst = reduced ? 0 : Math.max(nf.energy, nf.contact ?? 0, nf.finale ?? 0);
      objects.halo.material.opacity = (dimmed ? 0.25 : 0.6) + burst * 0.6;
      objects.halo.scale.setScalar(objects.radius * (4.2 + burst * 3));
      // Labels change only when a witness or counterexample is revealed.
      const labelKey = role;
      if (objects.labelKey !== labelKey) {
        const family = familyOf(n.evidence.kind);
        const next = labelFor(n.label, family, n.evidence.kind, role);
        next.position.copy(objects.label.position);
        objects.group.remove(objects.label);
        disposeTree(objects.label);
        objects.group.add(next);
        objects.label = next;
        objects.labelKey = labelKey;
      }
      objects.label.material.opacity = dimmed ? 0.35 : 1;
      const edge = w.edges.get(n.id);
      const ef = frame.edges[n.id];
      if (!edge || !ef) continue;
      const segments = Math.floor(ef.growth * TUBE_SEGMENTS);
      edge.tube.geometry.setDrawRange(0, segments * TUBE_SIDES * 6);
      edge.tube.visible = segments > 0;
      edge.tube.material.color.setHex(
        ef.reverse
          ? n.evidence.value
            ? TRUE
            : FALSE
          : KIND_COLORS[familyOf(tree.byId.get(n.parentId!)!.evidence.kind)],
      );
      edge.tube.material.opacity = dimmed
        ? 0.15
        : path.includes(n.id)
          ? 1
          : n.evidence.decisive && ef.reverse
            ? 0.85
            : 0.5;
      edge.pulse.visible = !reduced && ef.pulse !== null;
      if (ef.pulse !== null)
        edge.pulse.position.copy(
          edge.curve.getPoint(ef.reverse ? 1 - ef.pulse : ef.pulse),
        );
      if (edge.label) {
        edge.label.visible = ef.growth > 0.65;
        edge.label.material.opacity = dimmed ? 0.3 : 0.9;
      }
    }
  }, [frame, selectedId, path, tree, reduced]);

  // A click selects; a drag only rotates.
  useEffect(() => {
    const element = host.current;
    const w = world.current;
    if (!element || !w) return;
    let down: { x: number; y: number } | null = null;
    const press = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const release = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const box = w.renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((e.clientX - box.left) / box.width) * 2 - 1,
        -((e.clientY - box.top) / box.height) * 2 + 1,
      );
      const ray = new THREE.Raycaster();
      ray.setFromCamera(pointer, w.camera);
      const spheres = [...w.nodes.values()]
        .filter((o) => o.group.visible)
        .map((o) => o.sphere);
      const hit = ray.intersectObjects(spheres, false)[0];
      onSelect(hit ? (hit.object.userData.id as string) : "");
    };
    element.addEventListener("pointerdown", press);
    element.addEventListener("pointerup", release);
    return () => {
      element.removeEventListener("pointerdown", press);
      element.removeEventListener("pointerup", release);
    };
  }, [onSelect]);

  return (
    <div className="scene-3d" data-testid="reasoning-scene-3d">
      <div ref={host} className="scene-3d-host" />
      {failed ? (
        <div className="canvas-empty scene-3d-failure" role="alert">
          <h2>
            {failed.reason === "create"
              ? "El navegador no pudo iniciar la vista 3D."
              : "La vista 3D se quedó sin memoria de video."}
          </h2>
          <p>
            {failed.reason === "create"
              ? "Revisa que la aceleración por hardware esté activada en la configuración del navegador (Sistema → Usar aceleración por hardware) y reinícialo."
              : "Cierra pestañas o programas pesados y vuelve a intentarlo."}{" "}
            Mientras tanto, la vista 2D muestra el mismo árbol.
          </p>
          <code>{failed.detail}</code>
          <button className="primary-button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className="scene-3d-controls glass" aria-label="Controles de la vista 3D">
          <span>Arrastra para girar · rueda para acercar</span>
          <button
            aria-label={spinning ? "Detener giro" : "Girar automáticamente"}
            title={spinning ? "Detener giro" : "Girar automáticamente"}
            aria-pressed={spinning}
            disabled={reduced}
            onClick={() => setSpinning(!spinning)}
          >
            <RotateCw size={15} />
          </button>
          <button
            aria-label="Ajustar vista 3D"
            title="Ajustar vista"
            onClick={fit}
          >
            <Maximize size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
