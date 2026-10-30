import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type Viewport,
} from "@xyflow/react";
import { Crosshair, Focus, Maximize, Minus, Plus } from "lucide-react";
import { demoTrace, pathToNode } from "../features/demo/scenario";
import {
  DEMO_DURATION,
  demoSteps,
  ease,
  frameAt,
  type DemoFrame,
  type EdgeFrame,
  type NodeFrame,
} from "../reasoning/demoPlayback";
import type { ReasoningNode } from "../reasoning/types";
import {
  organicCurve,
  organicLayout,
  portraitLayout,
  syntheticTree,
  type Point,
} from "./organicLayout";

type GraphNode = Node<
  {
    reasoning: ReasoningNode;
    frame: NodeFrame;
    onPath: boolean;
    dimmed: boolean;
    reduced: boolean;
    synthetic: boolean;
  },
  "organic"
>;
type GraphEdge = Edge<
  {
    frame: EdgeFrame;
    highlighted: boolean;
    dimmed: boolean;
    color: string;
    bend: number;
    assignment: string;
    reduced: boolean;
  },
  "luminous"
>;
const stateLabels = {
  pending: "Pendiente",
  running: "En proceso",
  true: "Verdadero",
  false: "Falso",
  error: "Error",
};

const OrganicNode = memo(function OrganicNode({
  data,
  selected,
}: NodeProps<GraphNode>) {
  const { reasoning: n, frame, reduced } = data;
  const zoom = useStore((state) => state.transform[2]);
  const detail = selected || zoom > 1.12;
  const symbol =
    n.kind === "universal" ? "∀" : n.kind === "existential" ? "∃" : "P";
  return (
    <div
      className={`organic-node ${n.kind} state-${frame.state} ${selected ? "is-selected" : ""} ${data.onPath ? "on-path" : ""} ${data.dimmed ? "dimmed" : ""} ${detail ? "detailed" : ""}`}
      data-state={frame.state}
      style={
        {
          opacity: frame.appearance,
          transform: `scale(${0.55 + 0.45 * frame.appearance})`,
          "--label-size": `${Math.max(n.kind === "universal" ? 20 : 16, (n.kind === "universal" ? 13 : 10) / Math.max(0.4, zoom))}px`,
        } as CSSProperties
      }
    >
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="orb-shadow" />
      <div className="orb-halo" />
      <div className="orb-orbit orbit-one" />
      <div className="orb-orbit orbit-two" />
      {!reduced && frame.energy > 0 && (
        <div
          className="energy-ring"
          style={{
            transform: `translate(-50%,-50%) scale(${1 + frame.energy * 1.4})`,
            opacity: 1 - frame.energy,
          }}
        />
      )}
      <div className="orb-core">
        <span>{symbol}</span>
        <i className="orb-shine" />
      </div>
      <span
        className={`orb-status ${frame.state}`}
        aria-label={stateLabels[frame.state]}
      >
        {frame.state === "true"
          ? "✓"
          : frame.state === "false"
            ? "×"
            : frame.state === "error"
              ? "!"
              : frame.state === "running"
                ? "·"
                : "○"}
      </span>
      <div className="orb-label">
        <div className="orb-kind">
          {n.kind === "universal"
            ? "UNIVERSAL"
            : n.kind === "existential"
              ? "EXISTENCIAL"
              : data.synthetic
                ? "SINTÉTICO"
                : "TESTIGO"}
        </div>
        <div className="node-formula">{n.formula}</div>
        <div className="orb-detail">
          {data.synthetic
            ? "Sin valor de verdad"
            : n.kind === "universal"
              ? frame.state === "true"
                ? "Todos los casos verificados"
                : "Explorando el dominio"
              : n.kind === "existential"
                ? `x = ${n.environment.x} · ${stateLabels[frame.state]}`
                : frame.state === "true"
                  ? `(${n.environment.x},${n.environment.y}) ∈ P`
                  : "Comprobando pertenencia"}
        </div>
      </div>
    </div>
  );
});

const LuminousEdge = memo(function LuminousEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<GraphEdge>) {
  if (!data) return null;
  const { frame, color } = data;
  const curve = organicCurve(
    { x: sourceX, y: sourceY },
    { x: targetX, y: targetY },
    data.bend,
  );
  const label = curve.point(0.53);
  const pulse =
    frame.pulse === null
      ? null
      : curve.point(frame.reverse ? 1 - frame.pulse : frame.pulse);
  const gradientId = `gradient-${id.replace(/[^a-z0-9-]/gi, "-")}`;
  const opacity = data.dimmed ? 0.25 : data.highlighted ? 1 : 0.7;
  return (
    <g
      className={`luminous-edge ${data.highlighted ? "edge-active" : ""}`}
      opacity={opacity}
      data-growth={frame.growth.toFixed(3)}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop offset="0%" stopColor={color} />
          <stop offset="55%" stopColor="#69bfe8" />
          <stop offset="100%" stopColor="#77ead3" />
        </linearGradient>
      </defs>
      <path
        className="branch-aura"
        d={curve.path}
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={1 - frame.growth}
        stroke={`url(#${gradientId})`}
      />
      <path
        className="branch-filament"
        d={curve.path}
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={1 - frame.growth}
        stroke={`url(#${gradientId})`}
      />
      {frame.growth > 0.65 && (
        <g opacity={(frame.growth - 0.65) / 0.35} className="branch-assignment">
          <rect
            x={label.x - 27}
            y={label.y - 10}
            width={54}
            height={20}
            rx={10}
          />
          <text x={label.x} y={label.y + 4} textAnchor="middle">
            {data.assignment}
          </text>
        </g>
      )}
      {pulse && !data.reduced && (
        <g
          className="edge-pulse"
          data-direction={frame.reverse ? "to-parent" : "to-child"}
        >
          <circle
            cx={pulse.x}
            cy={pulse.y}
            r={12}
            fill={frame.reverse ? "#74f5c9" : "#9bd6ff"}
            opacity=".12"
          />
          <circle
            cx={pulse.x}
            cy={pulse.y}
            r={5}
            fill={frame.reverse ? "#74f5c9" : "#9bd6ff"}
            opacity=".5"
          />
          <circle cx={pulse.x} cy={pulse.y} r={2.2} fill="#effffc" />
        </g>
      )}
    </g>
  );
});
const nodeTypes = { organic: OrganicNode };
const edgeTypes = { luminous: LuminousEdge };

interface CameraProps {
  points: Record<string, Point>;
  step: number;
  follow: boolean;
  setFollow: (value: boolean) => void;
  reduced: boolean;
  selectedId: string;
  compact: boolean;
  synthetic: boolean;
  request: number;
  cancelRef: MutableRefObject<() => void>;
  playing: boolean;
}
function Camera({
  points,
  step,
  follow,
  setFollow,
  reduced,
  selectedId,
  compact,
  synthetic,
  request,
  cancelRef,
  playing,
}: CameraProps) {
  const { setViewport, getViewport } = useReactFlow();
  const width = useStore((state) => state.width),
    height = useStore((state) => state.height);
  const zoom = useStore((state) => state.transform[2]);
  const raf = useRef(0);
  const manualMotion = useRef(false);
  const wasPlaying = useRef(playing);
  const previousStep = useRef(step);
  const cancel = useCallback(() => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    cancelRef.current = cancel;
    return cancel;
  }, [cancel, cancelRef]);
  const animate = useCallback(
    (target: Viewport, instant = false, manual = false) => {
      cancel();
      manualMotion.current = manual;
      const start = getViewport(),
        began = performance.now();
      const tick = (now: number) => {
        const t = reduced || instant ? 1 : ease((now - began) / 950);
        void setViewport({
          x: start.x + (target.x - start.x) * t,
          y: start.y + (target.y - start.y) * t,
          zoom: start.zoom + (target.zoom - start.zoom) * t,
        });
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [cancel, getViewport, setViewport, reduced],
  );
  const frame = useCallback(
    (ids: readonly string[], instant = false, manual = false) => {
      const visible = ids.map((id) => points[id]).filter(Boolean);
      if (!visible.length || !width || !height) return;
      const left = Math.min(...visible.map((p) => p.x)) - 110,
        right = Math.max(...visible.map((p) => p.x)) + 110;
      const top = Math.min(...visible.map((p) => p.y)) - 85,
        bottom = Math.max(...visible.map((p) => p.y)) + 125;
      const topSpace = compact ? 30 : width < 600 ? 150 : 110;
      const bottomSpace = compact ? 35 : width < 600 ? 200 : 175;
      const usableHeight = Math.max(180, height - topSpace - bottomSpace);
      const targetZoom = Math.min(
        compact ? 1 : 1.18,
        (width - 65) / (right - left),
        usableHeight / (bottom - top),
      );
      animate(
        {
          x: width / 2 - ((left + right) / 2) * targetZoom,
          y: topSpace + usableHeight / 2 - ((top + bottom) / 2) * targetZoom,
          zoom: Math.max(0.08, targetZoom),
        },
        instant,
        manual,
      );
    },
    [points, width, height, compact, animate],
  );
  useEffect(() => {
    frame(Object.keys(points), true);
    return cancel;
  }, [width, height, points, request, frame, cancel]);
  useEffect(() => {
    if (!follow || synthetic) return;
    frame(demoSteps[step].focus);
    return () => {
      if (!manualMotion.current) cancel();
    };
  }, [step, follow, synthetic, frame, cancel]);
  useEffect(() => {
    if (
      wasPlaying.current &&
      !playing &&
      previousStep.current === step &&
      !manualMotion.current
    )
      cancel();
    wasPlaying.current = playing;
    previousStep.current = step;
  }, [playing, step, cancel]);
  const manual = () => {
    cancel();
    setFollow(false);
  };
  const zoomBy = (factor: number) => {
    manual();
    const current = getViewport();
    const next = Math.min(2.3, Math.max(0.08, current.zoom * factor));
    animate(
      {
        x: width / 2 - ((width / 2 - current.x) * next) / current.zoom,
        y: height / 2 - ((height / 2 - current.y) * next) / current.zoom,
        zoom: next,
      },
      false,
      true,
    );
  };
  return compact ? null : (
    <div className="spatial-controls glass" aria-label="Controles del árbol">
      <button aria-label="Acercar" title="Acercar" onClick={() => zoomBy(1.25)}>
        <Plus size={16} />
      </button>
      <span className="zoom-value">{Math.round(zoom * 100)}%</span>
      <button aria-label="Alejar" title="Alejar" onClick={() => zoomBy(0.8)}>
        <Minus size={16} />
      </button>
      <i />
      <button
        aria-label="Ajustar árbol"
        title="Ajustar árbol"
        onClick={() => {
          manual();
          frame(Object.keys(points), false, true);
        }}
      >
        <Maximize size={16} />
      </button>
      <button
        aria-label="Centrar seleccionado"
        title="Centrar seleccionado"
        onClick={() => {
          manual();
          frame([selectedId], false, true);
        }}
      >
        <Crosshair size={16} />
      </button>
      <button
        aria-label="Seguimiento automático"
        title="Seguimiento automático"
        aria-pressed={follow}
        onClick={() => setFollow(!follow)}
        className={follow ? "enabled" : ""}
      >
        <Focus size={16} />
      </button>
    </div>
  );
}

export interface CanvasProps {
  selectedId: string;
  onSelect: (id: string) => void;
  active: boolean;
  compact?: boolean;
  frame?: DemoFrame;
  reduced?: boolean;
  follow?: boolean;
  setFollow?: (value: boolean) => void;
  synthetic?: boolean;
  request?: number;
  playing?: boolean;
}
export function ReasoningCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <OrganicScene {...props} />
    </ReactFlowProvider>
  );
}
const defaultFrame = frameAt(DEMO_DURATION);
const noop = () => {};
function OrganicScene({
  selectedId,
  onSelect,
  active,
  compact = false,
  frame = defaultFrame,
  reduced = false,
  follow = false,
  setFollow = noop,
  synthetic = false,
  request = 0,
  playing = false,
}: CanvasProps) {
  const traceNodes = useMemo(
    () => (synthetic ? syntheticTree() : demoTrace.nodes),
    [synthetic],
  );
  const [portrait, setPortrait] = useState(
    () => matchMedia("(max-width:600px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width:600px)");
    const update = () => setPortrait(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const points = useMemo(
    () => (portrait && !synthetic ? portraitLayout : organicLayout(traceNodes)),
    [traceNodes, portrait, synthetic],
  );
  const path = useMemo(
    () => pathToNode(selectedId, traceNodes),
    [selectedId, traceNodes],
  );
  const cancelCamera = useRef<() => void>(noop);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const lastPointer = useRef(0);
  const nodes: GraphNode[] = traceNodes.map((n) => {
    const nf: NodeFrame = synthetic
      ? { appearance: 1, state: "pending", energy: 0 }
      : frame.nodes[n.id];
    return {
      id: n.id,
      type: "organic",
      position: { x: points[n.id].x - 90, y: points[n.id].y - 60 },
      selected: selectedId === n.id,
      focusable: nf.appearance > 0.05,
      selectable: nf.appearance > 0.05,
      style: { pointerEvents: nf.appearance > 0.05 ? "auto" : "none" },
      data: {
        reasoning: n,
        frame: nf,
        onPath: path.includes(n.id),
        dimmed: !!selectedId && !path.includes(n.id),
        reduced,
        synthetic,
      },
      ariaLabel: `${n.formula}, ${stateLabels[nf.state]}`,
      width: 180,
      height: 170,
    };
  });
  const edges: GraphEdge[] = traceNodes
    .filter((n) => n.parentId)
    .map((n, i) => ({
      id: `${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: "luminous",
      data: {
        frame: synthetic
          ? { growth: 1, pulse: null, reverse: false }
          : frame.edges[n.id],
        highlighted: path.includes(n.id),
        dimmed: !!selectedId && !path.includes(n.id),
        color: n.kind === "existential" ? "#af8dff" : "#65d4ef",
        bend: i % 2 ? -0.65 : 0.8,
        assignment: synthetic
          ? "SYN"
          : n.kind === "existential"
            ? `x = ${n.environment.x}`
            : `y = ${n.witness}`,
        reduced,
      },
      hidden: !synthetic && frame.edges[n.id].growth <= 0,
    }));
  return (
    <div
      className={`reasoning-canvas organic-scene ${compact ? "compact" : ""} ${reduced ? "motion-reduced" : ""} ${synthetic ? "synthetic-scene" : ""}`}
      data-testid="reasoning-canvas"
      onPointerMove={(event) => {
        if (
          reduced ||
          event.buttons ||
          performance.now() - lastPointer.current < 65
        )
          return;
        lastPointer.current = performance.now();
        const box = event.currentTarget.getBoundingClientRect();
        setParallax({
          x: (event.clientX - box.left - box.width / 2) * 0.009,
          y: (event.clientY - box.top - box.height / 2) * 0.009,
        });
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const id = (event.target as HTMLElement)
          .closest(".react-flow__node")
          ?.getAttribute("data-id");
        if (id) {
          event.preventDefault();
          event.stopPropagation();
          onSelect(id);
        }
      }}
    >
      <div
        className="cosmos"
        aria-hidden="true"
        style={{ transform: `translate(${parallax.x}px,${parallax.y}px)` }}
      >
        <div className="nebula nebula-violet" />
        <div className="nebula nebula-teal" />
        <div className="orbital-plane" />
        {Array.from({ length: 38 }, (_, i) => (
          <i
            key={i}
            className="dust"
            style={
              {
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 61 + 17) % 100}%`,
                opacity: 0.12 + (i % 5) * 0.07,
                width: i % 7 === 0 ? 2 : 1,
                height: i % 7 === 0 ? 2 : 1,
              } as CSSProperties
            }
          />
        ))}
      </div>
      {active ? (
        <ReactFlow<GraphNode, GraphEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => onSelect(node.id)}
          onPaneClick={() => onSelect("")}
          onMoveStart={(event) => {
            if (event) {
              cancelCamera.current();
              setFollow(false);
            }
          }}
          minZoom={0.08}
          maxZoom={2.3}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
          colorMode="dark"
          onlyRenderVisibleElements={synthetic}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        >
          <Camera
            points={points}
            step={frame.step}
            follow={follow}
            setFollow={setFollow}
            reduced={reduced}
            selectedId={selectedId || traceNodes[0].id}
            compact={compact}
            synthetic={synthetic}
            request={request}
            cancelRef={cancelCamera}
            playing={playing}
          />
        </ReactFlow>
      ) : (
        <div className="canvas-empty">
          <span className="empty-symbol">φ</span>
          <h2>Un nuevo razonamiento espera.</h2>
          <p>
            Abre Evaluar para calcular tu fórmula con una interpretación, o
            restaura el ejemplo para explorar el árbol DEMO.
          </p>
          <span className="demo-label">MOTOR SEMÁNTICO · FASE 2</span>
        </div>
      )}
    </div>
  );
}
