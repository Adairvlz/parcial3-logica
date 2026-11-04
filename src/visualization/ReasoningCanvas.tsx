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
import { Maximize, Minus, Plus } from "lucide-react";
import type { Evidence } from "../core/types";
import {
  ease,
  type EdgeFrame,
  type NodeFrame,
  type ReasoningFrame,
} from "../reasoning/playback";
import {
  pathToNode,
  type VisibleNode,
  type VisibleTree,
} from "../reasoning/tree";
import { organicCurve, organicLayout, type Point } from "./organicLayout";

/** From here on, halos and off-screen nodes are dropped to stay fluid. */
const DENSE_NODES = 40;

type GraphNode = Node<
  {
    node: VisibleNode;
    frame: NodeFrame;
    onPath: boolean;
    dimmed: boolean;
    reduced: boolean;
    onToggle: (id: string) => void;
  },
  "organic"
>;
type GraphEdge = Edge<
  {
    frame: EdgeFrame;
    highlighted: boolean;
    dimmed: boolean;
    decisive: boolean;
    color: string;
    endColor: string;
    value: boolean;
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
};
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
const familyOf = (kind: Evidence["kind"]) =>
  kind === "forall"
    ? "universal"
    : kind === "exists"
      ? "existential"
      : kind === "predicate" || kind === "equals"
        ? "predicate"
        : "connective";

const OrganicNode = memo(function OrganicNode({
  data,
  selected,
}: NodeProps<GraphNode>) {
  const { node: n, frame, reduced } = data;
  const zoom = useStore((state) => state.transform[2]);
  const detail = selected || zoom > 1.12;
  const family = familyOf(n.evidence.kind);
  const resolved = frame.state === "true" || frame.state === "false";
  const canToggle = n.hiddenChildren > 0 || n.childIds.length > 0;
  return (
    <div
      className={`organic-node ${family} state-${frame.state} ${resolved && n.role ? `role-${n.role}` : ""} ${selected ? "is-selected" : ""} ${data.onPath ? "on-path" : ""} ${data.dimmed ? "dimmed" : ""} ${detail ? "detailed" : ""}`}
      data-state={frame.state}
      style={
        {
          opacity: frame.appearance,
          transform: `scale(${0.55 + 0.45 * frame.appearance})`,
          "--label-size": `${Math.max(family === "universal" ? 20 : 16, (family === "universal" ? 13 : 10) / Math.max(0.4, zoom))}px`,
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
        <span>{n.symbol}</span>
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
            : frame.state === "running"
              ? "·"
              : "○"}
      </span>
      {canToggle && frame.appearance > 0.05 && (
        <button
          className="orb-expander nodrag nopan"
          aria-label={
            n.hiddenChildren > 0
              ? `Abrir ${n.hiddenChildren} ramas de ${n.label}`
              : `Colapsar ${n.label}`
          }
          title={n.hiddenChildren > 0 ? "Abrir ramas" : "Colapsar rama"}
          onClick={(event) => {
            event.stopPropagation();
            data.onToggle(n.id);
          }}
        >
          {n.hiddenChildren > 0 ? `+${n.hiddenChildren}` : "−"}
        </button>
      )}
      <div className="orb-label">
        <div className="orb-kind">
          {resolved && n.role === "witness"
            ? "TESTIGO"
            : resolved && n.role === "counterexample"
              ? "CONTRAEJEMPLO"
              : KIND_NAMES[n.evidence.kind]}
        </div>
        <div className="node-formula" title={n.label}>
          {n.label}
        </div>
        <div className="orb-detail">
          {resolved ? stateLabels[frame.state] : "Comprobando"}
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
  // Assignments are the reason for a branch: they stay readable when zoomed out.
  const zoom = useStore((state) => state.transform[2]);
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
  const returning = data.value ? "#74f5c9" : "#fb7185";
  const pulseColor = frame.reverse ? returning : "#9bd6ff";
  const gradientId = `gradient-${id.replace(/[^a-z0-9-]/gi, "-")}`;
  const opacity = data.dimmed
    ? 0.25
    : data.highlighted
      ? 1
      : data.decisive
        ? 0.75
        : 0.45;
  const labelWidth = data.assignment.length * 6.5 + 16;
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
          <stop offset="100%" stopColor={data.endColor} />
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
      {data.assignment && frame.growth > 0.65 && (
        <g
          opacity={(frame.growth - 0.65) / 0.35}
          className="branch-assignment"
          transform={`translate(${label.x} ${label.y}) scale(${Math.max(1, 0.8 / zoom)})`}
        >
          <rect
            x={-labelWidth / 2}
            y={-10}
            width={labelWidth}
            height={20}
            rx={10}
          />
          <text y={4} textAnchor="middle">
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
            fill={pulseColor}
            opacity=".12"
          />
          <circle
            cx={pulse.x}
            cy={pulse.y}
            r={5}
            fill={pulseColor}
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
  cameraDuration: number;
  points: Record<string, Point>;
  focus: readonly string[];
  follow: boolean;
  setFollow: (value: boolean) => void;
  reduced: boolean;
  cancelRef: MutableRefObject<() => void>;
  playing: boolean;
}
function Camera({
  cameraDuration,
  points,
  focus,
  follow,
  setFollow,
  reduced,
  cancelRef,
  playing,
}: CameraProps) {
  const { setViewport, getViewport } = useReactFlow();
  const width = useStore((state) => state.width),
    height = useStore((state) => state.height);
  const zoom = useStore((state) => state.transform[2]);
  const raf = useRef(0);
  const durationRef = useRef(cameraDuration);
  useEffect(() => {
    durationRef.current = cameraDuration;
  }, [cameraDuration]);
  const manualMotion = useRef(false);
  const wasPlaying = useRef(playing);
  const previousFocus = useRef(focus);
  const previousSize = useRef("");
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
        const t =
          reduced || instant
            ? 1
            : ease((now - began) / (manual ? 950 : durationRef.current));
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
      const topSpace = width < 600 ? 150 : 110;
      const bottomSpace = width < 600 ? 240 : 215;
      const usableHeight = Math.max(180, height - topSpace - bottomSpace);
      const targetZoom = Math.min(
        1.18,
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
    [points, width, height, animate],
  );
  useEffect(() => {
    // A resize jumps into place; opening a branch glides to the new shape.
    const size = `${width}x${height}`;
    const resized = previousSize.current !== size;
    previousSize.current = size;
    frame(Object.keys(points), resized);
    return cancel;
  }, [width, height, points, frame, cancel]);
  useEffect(() => {
    if (!follow) return;
    frame(focus);
    return () => {
      if (!manualMotion.current) cancel();
    };
  }, [focus, follow, frame, cancel]);
  useEffect(() => {
    if (
      wasPlaying.current &&
      !playing &&
      previousFocus.current === focus &&
      !manualMotion.current
    )
      cancel();
    wasPlaying.current = playing;
    previousFocus.current = focus;
  }, [playing, focus, cancel]);
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
  return (
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
    </div>
  );
}

export interface CanvasProps {
  cameraDuration: number;
  tree: VisibleTree;
  selectedId: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  frame: ReasoningFrame;
  focus: readonly string[];
  reduced: boolean;
  follow: boolean;
  setFollow: (value: boolean) => void;
  playing: boolean;
}
export function ReasoningCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <OrganicScene {...props} />
    </ReactFlowProvider>
  );
}
function OrganicScene({
  cameraDuration,
  tree,
  selectedId,
  onSelect,
  onToggle,
  frame,
  focus,
  reduced,
  follow,
  setFollow,
  playing,
}: CanvasProps) {
  const points = useMemo(() => organicLayout(tree.nodes), [tree]);
  const path = useMemo(() => pathToNode(tree, selectedId), [tree, selectedId]);
  const dense = tree.nodes.length > DENSE_NODES;
  const cancelCamera = useRef<() => void>(() => {});
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const lastPointer = useRef(0);
  const nodes: GraphNode[] = tree.nodes.map((n) => {
    const nf = frame.nodes[n.id];
    return {
      id: n.id,
      type: "organic",
      position: { x: points[n.id].x - 90, y: points[n.id].y - 60 },
      selected: selectedId === n.id,
      focusable: nf.appearance > 0.05,
      selectable: nf.appearance > 0.05,
      style: { pointerEvents: nf.appearance > 0.05 ? "auto" : "none" },
      data: {
        node: n,
        frame: nf,
        onPath: path.includes(n.id),
        dimmed: !!selectedId && !path.includes(n.id),
        reduced,
        onToggle,
      },
      ariaLabel: `${n.label}, ${stateLabels[nf.state]}`,
      width: 180,
      height: 170,
    };
  });
  const edges: GraphEdge[] = tree.nodes
    .filter((n) => n.parentId)
    .map((n, i) => {
      // Siblings bow away from each other, so their branches never cross.
      const offset = points[n.id].x - points[n.parentId!].x;
      const bend = offset < 0 ? -0.65 : offset > 0 ? 0.8 : i % 2 ? -0.65 : 0.8;
      return {
        id: `${n.parentId}-${n.id}`,
        source: n.parentId!,
        target: n.id,
        type: "luminous" as const,
        data: {
          frame: frame.edges[n.id],
          highlighted: path.includes(n.id),
          dimmed: !!selectedId && !path.includes(n.id),
          decisive: frame.edges[n.id].reverse && !!n.evidence.decisive,
          color:
            tree.byId.get(n.parentId!)!.evidence.kind === "forall"
              ? "#af8dff"
              : "#65d4ef",
          endColor: !frame.edges[n.id].reverse
            ? "#69bfe8"
            : n.evidence.value
              ? "#77ead3"
              : "#fb7185",
          value: n.evidence.value,
          bend,
          assignment: n.edgeLabel,
          reduced,
        },
        hidden: frame.edges[n.id].growth <= 0,
      };
    });
  return (
    <div
      className={`reasoning-canvas organic-scene ${dense ? "dense-scene" : ""} ${reduced ? "motion-reduced" : ""}`}
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
        const target = event.target as HTMLElement;
        if (target.tagName === "BUTTON") return;
        const id = target.closest(".react-flow__node")?.getAttribute("data-id");
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
        onlyRenderVisibleElements={dense}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
      >
        <Camera
          cameraDuration={cameraDuration}
          points={points}
          focus={focus}
          follow={follow}
          setFollow={setFollow}
          reduced={reduced}
          cancelRef={cancelCamera}
          playing={playing}
        />
      </ReactFlow>
    </div>
  );
}
