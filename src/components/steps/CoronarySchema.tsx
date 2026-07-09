import { useState, useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import axios from "axios";
import { InterventionData } from "@/types/intervention";
import { Network, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { toPng } from "html-to-image";

const SNAPSHOT_KEY = "schemaImage";
const captureSchema = async () => {
  const node = document.getElementById("coronary-schema-svg");

  if (!node) {
    throw new Error("Schéma introuvable");
  }

  const img = await toPng(node, {
    backgroundColor: "#fff",
    pixelRatio: 2
  });

  return img;
};

const nomenclature: Record<string, string> = {
  "1": "RCA Prox", "2": "RCA Mid", "3": "RCA Dist", "4": "PDA", "5": "Left Main",
  "6": "LAD Prox", "7": "LAD Mid", "8": "LAD Apical", "9": "Diag 1", "9a": "Diag 2",
  "10": "Diag 3", "10a": "Diag 4", "11": "Cx Prox", "12": "OM 1", "12a": "OM 2",
  "12b": "OM 3", "13": "Cx Dist", "14": "Marg 1", "14a": "Marg 2", "14b": "Marg 3",
  "16": "PL RCA", "16a": "PL A", "16b": "PL B", "16c": "PL C"
};

const SEGMENTS = [
  { id: "1", d: "m 38.566537,70.126573 -8.278374,-2.434815 -3.760895,0.306587 -3.543554,1.316623 -2.351775,1.540395 -2.355536,2.602039 -2.434815,4.460583 v 9.414621", w: 4.5 },
  { id: "2", d: "m 15.889227,86.739862 0.277002,10.494328 1.29857,12.01176 2.272493,10.06391 2.759459,6.00588 2.110173,2.59714", w: 4.0 },
  { id: "3", d: "m 24.551539,127.84125 5.898944,5.42822 5.842053,1.56012 5.195778,0.38773 4.222533,-1.49413 6.328334,-2.23925 1.62321,-1.13625", w: 3.5 },
  { id: "4", d: "m 50.860731,131.75987 5.3566,4.38267 3.24641,3.8957 1.94786,3.40875 0.64928,2.27249", w: 2.8 },
  { id: "5", d: "m 90.766179,71.510228 6.342073,1.58552 1.882801,0.49547 -1.387326,4.55837", w: 4.5 },
  { id: "6", d: "m 98.896695,73.442518 33.764035,11.7413", w: 4.2 },
  { id: "7", d: "m 132.25431,85.024552 10.21402,4.788696 7.49344,4.81061 7.40093,7.215902 1.75773,2.3128", w: 3.5 },
  { id: "8", d: "m 159.08241,104.098 4.63769,7.5221 2.49782,6.10577 1.38767,9.89874 -1.57269,8.41856 -4.16303,4.16303 -9.5287,2.12777 -2.49781,-0.27754", w: 3.0 },
  { id: "9", d: "m 124.58768,82.201388 20.81512,-8.14103 10.17628,-2.12776 20.6301,2.68283", w: 2.0 },
  { id: "9a", d: "m 137.63182,87.382038 17.11465,-3.60795 5.92075,0.0925 18.2248,5.64321 9.7201,4.25235", w: 2.0 },
  { id: "10", d: "m 154.17067,98.666068 13.34321,-0.91235 8.66738,1.0264 13.11513,7.070762", w: 2.0 },
  { id: "10a", d: "m 160.67121,106.53514 12.77299,4.44774 13.45725,7.29885", w: 2.0 },
  { id: "11", d: "m 97.736513,77.850318 -2.709254,9.01962 -1.684612,6.04479 -2.180088,10.217462", w: 3.8 },
  { id: "12", d: "m 98.247759,75.288918 21.555211,18.50233", w: 2.2 },
  { id: "12a", d: "m 93.899711,90.527438 4.903118,1.5727 5.550701,2.4053 4.34804,0.37005 5.18066,2.96037 7.30842,9.991262", w: 2.0 },
  { id: "12b", d: "m 91.931063,99.963628 5.088141,1.942742 2.682838,1.20265 2.220278,-0.0925 4.16303,1.85024 13.32168,10.08377", w: 2.0 },
  { id: "13", d: "m 91.172935,103.07743 0.187813,5.98976 0.79276,7.03574 1.783708,8.02668 3.601109,6.54027 1.551823,2.57646 0.891855,0.69367", w: 3.2 },
  { id: "14", d: "m 91.561016,108.93726 5.920746,2.22028 9.436188,4.07051 8.78861,3.70047 4.44056,3.42293", w: 2.5 },
  { id: "14a", d: "m 93.622176,122.68078 6.290797,0.64758 7.863487,1.11015 6.3833,1.75771 11.74898,4.62559", w: 2.2 },
  { id: "14b", d: "m 99.781823,133.70812 h 8.522157 l 13.576,0.0991 10.10767,0.59457 8.42307,0.59457", w: 2.0 },
  { id: "16", d: "m 53.635208,130.38775 17.843593,-15.18656 1.48086,-1.2692", w: 2.2 },
  { id: "16a", d: "m 56.536961,127.68425 11.93219,13.22916", w: 2.0 },
  { id: "16b", d: "m 63.886501,121.46914 13.05624,17.46596", w: 2.0 },
  { id: "16c", d: "m 72.695561,114.08846 5.10145,7.00368 2.76688,5.36084 1.90223,5.10144", w: 2.0 }
];

interface SegmentState {
  stenosis: number;
  stent: boolean;
  type: string;
  timi: number;
}

interface Props {
  data: InterventionData;
  onChange: (data: Partial<InterventionData>) => void;
  onNextStep?: (step?: number) => void;
  onPrevStep?: () => void;
}

const CoronarySchema = ({ data, onChange, onNextStep, onPrevStep }: Props) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<Array<{ id: string; x: number; y: number; anchorX: number; anchorY: number; text: string }>>([]);
  const [centerArrowPath, setCenterArrowPath] = useState<string | null>(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const saveLesions = async () => {
    if (!data.interventionId) {
      toast.error("ID d'intervention manquant. Créez d'abord une intervention avant d'enregistrer les lésions.");
      return;
    }

    const interventionId = Number(data.interventionId);
    if (!interventionId) {
      toast.error("ID d'intervention invalide.");
      return;
    }

    setIsSaving(true);

    try {
      const schemaCoronaireData = data.schemaCoronaireData as Record<string, SegmentState>;

      const lesions = Object.entries(schemaCoronaireData || {})
        .filter(([, seg]) => {
          return seg.stenosis > 0 || seg.stent || seg.type !== "A" || seg.timi !== 3;
        })
        .map(([segmentCode, seg]) => ({
          segmentCode,
          type: seg.type,
          timi: seg.timi,
          stenose: seg.stenosis,
          stentPose: seg.stent,
          remarques: data.schemaCoronaireNotes || "",
        }));

      const payload = { lesions };

      // 1. SAVE DB
      await axios.post(
        `http://localhost:5106/api/Interventions/${interventionId}/lesions`,
        payload,
      );

      // 2. CAPTURE SVG/SCHEMA
      const img = await captureSchema();

      // 3. STORE TEMPORARY
      sessionStorage.setItem(SNAPSHOT_KEY, img);

      toast.success("Lésions enregistrées avec succès.");
      console.log("Lésions + snapshot enregistrés");

    } catch (error) {
      console.error("Erreur lors de l'enregistrement des lésions", error);
      toast.error("Erreur lors de l'enregistrement des lésions.");
    } finally {
      setIsSaving(false);
    }
  };

  // Charger et initialiser les lésions
  useEffect(() => {
    const initializeSchema = async () => {
      // Vérifier si on doit charger depuis l'API
      if (data.interventionId) {
        try {
          const res = await axios.get(
            `http://localhost:5106/api/interventions/${data.interventionId}/lesions`
          );

          const lesions = res.data;

          if (lesions && lesions.length > 0) {
            const rebuilt: Record<string, SegmentState> = {};
            const loadedSegmentIds: string[] = [];

            // État par défaut
            SEGMENTS.forEach((seg) => {
              rebuilt[seg.id] = {
                stenosis: 0,
                stent: false,
                type: "A",
                timi: 3,
              };
            });

            // Injecter lesions DB
            lesions.forEach((l: any) => {
              rebuilt[l.segmentCode] = {
                stenosis: l.stenose || 0,
                stent: l.stentPose || false,
                type: l.type || "A",
                timi: l.timi ?? 3,
              };
              loadedSegmentIds.push(l.segmentCode);
            });

            onChange({
              schemaCoronaireData: rebuilt,
            });

            // Auto-select les lésions chargées pour afficher les overlays
            setSelectedIds(loadedSegmentIds);
            if (loadedSegmentIds.length > 0) {
              setActiveId(loadedSegmentIds[0]);
            }
            return;
          }
        } catch (err) {
          console.error("Erreur chargement lésions", err);
        }
      }

      // Initialiser avec état par défaut si vide
      if (!data.schemaCoronaireData || Object.keys(data.schemaCoronaireData).length === 0) {
        const initial: Record<string, SegmentState> = {};
        SEGMENTS.forEach((seg) => {
          initial[seg.id] = { stenosis: 0, stent: false, type: "A", timi: 3 };
        });
        onChange({ schemaCoronaireData: initial });
      }
    };

    initializeSchema();
  }, [data.interventionId]);

  const segmentsState: Record<string, SegmentState> = data.schemaCoronaireData as Record<string, SegmentState> || {};

  const handleUpdateSegment = (id: string, updates: Partial<SegmentState>) => {
    const currentState = segmentsState[id];
    if (!currentState) return;

    const newState = { ...currentState, ...updates };
    if (updates.stent === true) {
      newState.stenosis = 0;
      newState.timi = 3;
    }

    onChange({
      schemaCoronaireData: {
        ...segmentsState,
        [id]: newState,
      },
    });
  };

  const activeSegment = activeId ? segmentsState[activeId] : null;

  const getSvgPoint = (event: React.PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    return point.matrixTransform(matrix.inverse());
  };

 const handleAnnotationPointerDown = (event: ReactPointerEvent<SVGGElement>, id: string) => {
    const svgPoint = getSvgPoint(event);
    if (!svgPoint) return; 

    const current = annotations.find((annotation) => annotation.id === id);
    const startX = current?.x ?? svgPoint.x;
    const startY = current?.y ?? svgPoint.y;

    setDraggingAnnotationId(id);
    setDragOffset({ x: svgPoint.x - startX, y: svgPoint.y - startY });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSvgPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingAnnotationId || !dragOffset) return;

    const svgPoint = getSvgPoint(event);
    if (!svgPoint) return;

    setAnnotations((current) => current.map((annotation) => (
      annotation.id === draggingAnnotationId
        ? { ...annotation, x: svgPoint.x - dragOffset.x, y: svgPoint.y - dragOffset.y }
        : annotation
    )));
  };

  const handleSvgPointerUp = () => {
    setDraggingAnnotationId(null);
    setDragOffset(null);
  };

  const validSegments = Object.keys(segmentsState).filter((id) => {
    const s = segmentsState[id];
    return s.stenosis > 0 || s.stent || s.type !== "A" || s.timi !== 3;
  }).sort((a, b) => parseFloat(a) - parseFloat(b));

  useEffect(() => {
    if (selectedIds.length === 0 || !svgRef.current) {
      setAnnotations([]);
      setCenterArrowPath(null);
      return;
    }

    const existingById = Object.fromEntries(annotations.map((annotation) => [annotation.id, annotation]));
    const nextAnnotations: Array<{ id: string; x: number; y: number; anchorX: number; anchorY: number; text: string }> = [];
    let arrowPath: string | null = null;

    selectedIds.forEach((id) => {
      const path = svgRef.current?.querySelector<SVGPathElement>(`[data-seg-id="${id}"]`);
      if (!path || typeof path.getTotalLength !== "function") return;

      try {
        const len = path.getTotalLength();
        const pt = path.getPointAtLength(len / 2);
        const p1 = path.getPointAtLength(Math.max(0, len * 0.45));
        const p2 = path.getPointAtLength(Math.min(len, len * 0.55));
        const segment = segmentsState[id];
        if (!segment) return;

        const previous = existingById[id];
        nextAnnotations.push({
          id,
          anchorX: pt.x,
          anchorY: pt.y,
          x: previous?.x ?? pt.x + 16,
          y: previous?.y ?? pt.y - 14,
          text: `${nomenclature[id] || "Artère"} | ${segment.stent ? "STENT" : segment.stenosis + "%"}`,
        });

        if (id === activeId) {
          arrowPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
        }
      } catch {
        return;
      }
    });

    setAnnotations(nextAnnotations);
    setCenterArrowPath(arrowPath);
  }, [selectedIds, activeId, data.schemaCoronaireData]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Schéma Coronaire</h2>
      </div>


      <div className="grid lg:grid-cols-3 gap-6">

        {/* Colonne Gauche: Atlas & Bilan des lésions */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Atlas Component */}
          <div className="clinical-card flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Network size={20} className="text-primary" />
              <h3 className="font-medium text-foreground">Atlas Interactif</h3>
            </div>

            <div className="bg-black border border-border rounded-lg relative overflow-hidden flex items-center justify-center min-h-[350px]">
              <svg
                ref={svgRef}
                id="coronary-schema-svg"
                viewBox="0 60 210 90"
                className="w-full h-full max-h-[500px]"
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerLeave={handleSvgPointerUp}
              >
                <defs>
                  <linearGradient id="vesselGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#4a0000" } as CSSProperties} />
                    <stop offset="50%" style={{ stopColor: "#c01010" } as CSSProperties} />
                    <stop offset="100%" style={{ stopColor: "#4a0000" } as CSSProperties} />
                  </linearGradient>
                  <pattern id="stentPattern" patternUnits="userSpaceOnUse" width="1.2" height="1.2">
                    <path d="M-1,1 l2,-2 M0,1.2 l1.2,-1.2" stroke="#ffffff" strokeWidth="0.08" opacity="0.3" />
                  </pattern>
                  <marker id="arrowHead" markerUnits="strokeWidth" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#ffcc00" />
                  </marker>
                </defs>
                <g>
             {SEGMENTS.map((seg) => {
  const stateInfo = segmentsState[seg.id];
  if (!stateInfo) return null;

  const isSelected = selectedIds.includes(seg.id);

  // largeur normale diminuée selon la sténose
  const vesselWidth = stateInfo.stent
    ? seg.w
    : Math.max(seg.w * (1 - stateInfo.stenosis / 100), 1);

  const baseOpacity = 0.3 + (stateInfo.timi * 0.23);

  return (
    <g
      key={seg.id}
      style={{ cursor: "pointer" }}
      onClick={() => {
        setSelectedIds((current) =>
          current.includes(seg.id)
            ? current.filter((item) => item !== seg.id)
            : [...current, seg.id]
        );
        setActiveId(seg.id);
      }}
    >

      {/* Halo jaune uniquement si sténose */}
      {stateInfo.stenosis > 0 && !stateInfo.stent && (
        <path
          d={seg.d}
          fill="none"
          stroke="#FFD700"
          strokeWidth={seg.w + 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      )}

      {/* Vaisseau principal */}
      <path
        d={seg.d}
        fill="none"
        stroke="url(#vesselGradient)"
        strokeWidth={vesselWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isSelected ? 0.7 : baseOpacity}
        style={{
          transition: "all 0.3s",
          filter: isSelected
            ? "drop-shadow(0 0 4px rgba(255,255,255,0.95))"
            : "none"
        }}
        data-seg-id={seg.id}
      />


      {/* Effet stent */}
      {stateInfo.stent && (
        <>
          <path
            d={seg.d}
            fill="none"
            stroke="#5dade2"
            strokeWidth={seg.w + 0.8}
            strokeLinecap="round"
            opacity={0.8}
            pointerEvents="none"
          />

          <path
            d={seg.d}
            fill="none"
            stroke="url(#stentPattern)"
            strokeWidth={seg.w + 0.5}
            pointerEvents="none"
            opacity={1}
          />
        </>
      )}

    </g>
  );
})}
                    );
                  )
                  {annotations.map((annotation) => (
                    <g
                      key={annotation.id}
                      style={{ cursor: "grab" }}
                      onPointerDown={(event) => handleAnnotationPointerDown(event, annotation.id)}
                    >
                      <line
                        x1={annotation.anchorX}
                        y1={annotation.anchorY}
                        x2={annotation.x}
                        y2={annotation.y}
                        stroke="#888"
                        strokeWidth={0.3}
                        strokeDasharray="1 0.5"
                        pointerEvents="none"
                      />
                      <circle cx={annotation.anchorX} cy={annotation.anchorY} r={0.6} fill="#fff" pointerEvents="none" />
                      <g transform={`translate(${annotation.x}, ${annotation.y})`}>
                        {(() => {
                          const width = Math.max(annotation.text.length * 3.2, 40);
                          return (
                            <>
                              <rect
                                 x={-width / 2}
  y={-5}
  width={width}
  height={11}
  rx={1}
  fill="#333"
  stroke="#555"
  strokeWidth={0.2}
                              />
                            <text
  x={0}
  y={0.5} // <--- AJUSTEMENT : Une légère valeur positive (ex: 0.5) remonte le texte
  fill="#fff"
  fontSize={3}
  fontFamily="Arial, sans-serif"
  textAnchor="middle"
  dominantBaseline="central" // <--- Remplacer "middle" par "central" est souvent plus précis
  pointerEvents="none"
  style={{ dominantBaseline: "central" }} // <--- Parfois nécessaire en CSS pour forcer le rendu
>
  {annotation.text}
</text>
                            </>
                          );
                        })()}
                      </g>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>

          {/* Bilan Component (Tableau) */}
          <div className="clinical-card flex flex-col gap-4">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              Bilan des lésions marquées
            </h3>

            <div className="border rounded-md bg-muted/20 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/40 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 text-muted-foreground font-medium w-16">Seg</th>
                    <th className="py-2.5 px-3 text-muted-foreground font-medium">Type</th>
                    <th className="py-2.5 px-3 text-muted-foreground font-medium">TIMI</th>
                    <th className="py-2.5 px-3 text-muted-foreground font-medium">Débit / Sténose</th>
                  </tr>
                </thead>
                <tbody>
                  {validSegments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">Aucune lésion marquée. Cliquez sur l'atlas pour déclarer.</td>
                    </tr>
                  ) : (
                    validSegments.map((id) => {
                      const d = segmentsState[id];
                      return (
                        <tr key={id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold">{id}</td>
                          <td className="py-3 px-3 font-medium">{d.type}</td>
                          <td className="py-3 px-3 text-muted-foreground">T{d.timi}</td>
                          <td className="py-3 px-3">
                            {d.stent ? (
                              <span className="text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded text-[11px] tracking-wide">STENT</span>
                            ) : (
                              <span className={d.stenosis > 50 ? 'text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded text-[11px] tracking-wide' : 'px-2 py-0.5'}>{d.stenosis}%</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Colonne Droite: Editeur & Notes */}
        <div className="flex flex-col gap-6">

          {/* L'éditeur */}
          <div className="clinical-card flex flex-col gap-4 min-h-[300px]">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              Détails du Segment
            </h3>

            {activeId ? (
              <div className="flex flex-col gap-5 animate-fade-in">
                <div className="bg-primary/10 border border-primary/20 px-3 py-2 rounded-md">
                  <h4 className="font-bold text-primary text-sm">
                    {nomenclature[activeId] || "Artère"} (Seg. {activeId})
                  </h4>
                </div>

                <div className="space-y-5">
                  {/* TYPE */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Type Lésion</Label>
                    <div className="flex bg-muted rounded p-1 gap-1">
                      {["A", "B", "C"].map((t) => (
                        <button
                          key={t}
                          onClick={() => activeId && handleUpdateSegment(activeId, { type: t })}
                          className={`flex-1 text-sm font-medium py-1.5 rounded transition-colors ${activeSegment?.type === t ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/80'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TIMI */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Flux TIMI</Label>
                    <div className="flex bg-muted rounded p-1 gap-1">
                      {[0, 1, 2, 3].map((v) => (
                        <button
                          key={v}
                          onClick={() => activeId && handleUpdateSegment(activeId, { timi: v })}
                          className={`flex-1 text-sm font-medium py-1.5 rounded transition-colors ${activeSegment?.timi === v ? 'bg-background text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-background/80'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STENOSIS */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-xs text-muted-foreground">Sténose (%)</Label>
                      <span className="text-xs font-mono font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">{activeSegment?.stent ? 'TRAITÉ' : activeSegment?.stenosis + '%'}</span>
                    </div>
                    <Slider
                      value={[activeSegment?.stenosis || 0]}
                      min={0}
                      max={100}
                      step={1}
                      disabled={activeSegment?.stent}
                      onValueChange={(val) => activeId && handleUpdateSegment(activeId, { stenosis: val[0] })}
                      className="py-2"
                    />
                  </div>

                  {/* STENT */}
                  <div className="flex items-center gap-2 pt-4 justify-center border-t border-border mt-2">
                    <Checkbox
                      id="stent-check"
                      className="w-5 h-5"
                      checked={activeSegment?.stent || false}
                      onCheckedChange={(c) => activeId && handleUpdateSegment(activeId, { stent: !!c })}
                    />
                    <Label htmlFor="stent-check" className="text-blue-500 font-bold cursor-pointer text-base">✓ Appliquer un Stent</Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 border-dashed border border-border p-6 rounded-lg flex flex-col items-center justify-center text-center bg-muted/10">
                <p className="text-sm text-muted-foreground">Sélectionnez une artère sur l'atlas à gauche pour éditer ses propriétés.</p>
              </div>
            )}
          </div>

          <Button
            onClick={saveLesions}
            className="w-full"
            disabled={isSaving}
          >
            {isSaving ? "Enregistrement…" : "✓ Enregistrer lésions"}
          </Button>

        </div>

      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onPrevStep}>
          Retour
        </Button>
        <Button onClick={() => onNextStep?.()}>
          Suivant
        </Button>
      </div>
    </div>
  );

};

export default CoronarySchema;
