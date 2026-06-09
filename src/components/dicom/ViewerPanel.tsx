import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, ScanSearch, Loader2, AlertCircle, X, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { DicomCine } from "@/types/dicom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import axios from "axios";

import * as cornerstone from "cornerstone-core";
import * as cornerstoneTools from "cornerstone-tools";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Detection {
  frame: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface StenosisApiResponse {
  success: boolean;
  instanceId: string;
  detections: Detection[];
}

// Map: frameNumber → detections after NMS
type DetectionsByFrame = Map<number, Detection[]>;

interface Props {
  selectedCine: DicomCine | null;
}

// ─── IoU helper ───────────────────────────────────────────────────────────────

function iou(a: Detection, b: Detection): number {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const interX1 = Math.max(a.x, b.x);
  const interY1 = Math.max(a.y, b.y);
  const interX2 = Math.min(ax2, bx2);
  const interY2 = Math.min(ay2, by2);

  if (interX2 <= interX1 || interY2 <= interY1) return 0;

  const interArea = (interX2 - interX1) * (interY2 - interY1);
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  return interArea / (aArea + bArea - interArea);
}

// NMS: for a list of detections on the same frame, suppress overlapping boxes.
// iouThreshold: boxes with IoU > threshold are considered the same stenosis.
function nms(detections: Detection[], iouThreshold = 0.4): Detection[] {
  // Sort by confidence descending
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];

  for (const det of sorted) {
    const suppressed = kept.some((k) => iou(k, det) > iouThreshold);
    if (!suppressed) kept.push(det);
  }

  return kept;
}

// Group all detections by frame, apply NMS per frame
function groupAndFilter(detections: Detection[]): DetectionsByFrame {
  const byFrame = new Map<number, Detection[]>();

  for (const d of detections) {
    if (!byFrame.has(d.frame)) byFrame.set(d.frame, []);
    byFrame.get(d.frame)!.push(d);
  }

  const result: DetectionsByFrame = new Map();
  for (const [frame, dets] of byFrame) {
    result.set(frame, nms(dets));
  }

  return result;
}

// ─── Confidence → color ───────────────────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.65) return "#ef4444"; // red   — high
  if (confidence >= 0.45) return "#f97316"; // orange — medium
  return "#facc15";                          // yellow — low
}

// ─── Canvas overlay drawing ───────────────────────────────────────────────────

function getOrCreateOverlay(element: HTMLDivElement): HTMLCanvasElement | null {
  const csCanvas = element.querySelector<HTMLCanvasElement>("canvas");
  if (!csCanvas) return null;

  let overlay = element.querySelector<HTMLCanvasElement>("canvas.stenosis-overlay");
  if (!overlay) {
    overlay = document.createElement("canvas");
    overlay.className = "stenosis-overlay";
    overlay.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    element.style.position = "relative";
    element.appendChild(overlay);
  }

  overlay.width = csCanvas.width;
  overlay.height = csCanvas.height;
  return overlay;
}

function drawDetections(element: HTMLDivElement, detections: Detection[]) {
  try {
    cornerstone.getEnabledElement(element);
  } catch {
    return;
  }

  const overlay = getOrCreateOverlay(element);
  if (!overlay) return;

  const ctx = overlay.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!detections.length) return;

  const enabledElement = cornerstone.getEnabledElement(element);
  if (!enabledElement?.image) return;

  detections.forEach((det, i) => {
    const color = confidenceColor(det.confidence);

    const topLeft     = cornerstone.pixelToCanvas(element, { x: det.x, y: det.y });
    const bottomRight = cornerstone.pixelToCanvas(element, { x: det.x + det.width, y: det.y + det.height });
    const w = bottomRight.x - topLeft.x;
    const h = bottomRight.y - topLeft.y;

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Main rect
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(topLeft.x, topLeft.y, w, h);

    // Corner L-brackets
    const cs = Math.min(Math.abs(w), Math.abs(h)) * 0.28;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topLeft.x + cs, topLeft.y);     ctx.lineTo(topLeft.x, topLeft.y);         ctx.lineTo(topLeft.x, topLeft.y + cs);
    ctx.moveTo(bottomRight.x - cs, topLeft.y); ctx.lineTo(bottomRight.x, topLeft.y);     ctx.lineTo(bottomRight.x, topLeft.y + cs);
    ctx.moveTo(topLeft.x, bottomRight.y - cs); ctx.lineTo(topLeft.x, bottomRight.y);     ctx.lineTo(topLeft.x + cs, bottomRight.y);
    ctx.moveTo(bottomRight.x - cs, bottomRight.y); ctx.lineTo(bottomRight.x, bottomRight.y); ctx.lineTo(bottomRight.x, bottomRight.y - cs);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Label
    const label = `S${i + 1} — ${Math.round(det.confidence * 100)}%`;
    const fontSize = Math.max(10, Math.abs(h) * 0.16);
    ctx.font = `600 ${fontSize}px monospace`;
    const textW = ctx.measureText(label).width;
    const padX = 5, padY = 3;
    const labelX = topLeft.x;
    const labelY = topLeft.y - fontSize - padY * 2;

    ctx.fillStyle = color + "cc";
    ctx.fillRect(labelX, labelY < 0 ? topLeft.y + 2 : labelY, textW + padX * 2, fontSize + padY * 2);
    ctx.fillStyle = "#000";
    ctx.fillText(label, labelX + padX, (labelY < 0 ? topLeft.y + 2 : labelY) + fontSize + padY - 1);
  });
}

function clearOverlay(element: HTMLDivElement) {
  const overlay = element.querySelector<HTMLCanvasElement>("canvas.stenosis-overlay");
  if (overlay) {
    overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const ViewerPanel = ({ selectedCine }: Props) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [totalFrames, setTotalFrames] = useState(1);
  const [imageReady, setImageReady] = useState(false);

  // Stenosis state
  const [analyzing, setAnalyzing] = useState(false);
  const [stenosisError, setStenosisError] = useState<string | null>(null);
  const [detectionsByFrame, setDetectionsByFrame] = useState<DetectionsByFrame>(new Map());
  const [framesWithDetections, setFramesWithDetections] = useState<number[]>([]);

  // Derived: detections for the currently displayed frame
  const currentDetections = detectionsByFrame.get(currentFrame) ?? [];

  // ── Redraw whenever frame or detections change ───────────────────────────

  useEffect(() => {
    if (!elementRef.current || !imageReady) return;
    const element = elementRef.current;
    try { cornerstone.getEnabledElement(element); } catch { return; }
    const dets = detectionsByFrame.get(currentFrame) ?? [];
    if (dets.length > 0) {
      drawDetections(element, dets);
    } else {
      clearOverlay(element);
    }
  }, [currentFrame, detectionsByFrame, imageReady]);

  // ── Load DICOM image ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedCine || !elementRef.current) return;

    const element = elementRef.current;
    cornerstone.enable(element);

    const imageId = `wadouri:http://localhost:5106/api/DicomImages/${selectedCine.instanceId}`;

    setIsPlaying(false);
    setCurrentFrame(1);
    setTotalFrames(1);
    setDetectionsByFrame(new Map());
    setFramesWithDetections([]);
    setStenosisError(null);
    setImageReady(false);

    const onNewImage = () => {
      const toolState = cornerstoneTools.getToolState(element, "stack");
      if (toolState?.data?.[0]) {
        const newFrame = toolState.data[0].currentImageIdIndex + 1;
        setCurrentFrame(newFrame);
      }
    };

    // Redraw stenosis boxes every time cornerstone repaints (zoom, pan, resize...)
    const onImageRendered = () => {
      const toolState = cornerstoneTools.getToolState(element, "stack");
      const frameIndex = toolState?.data?.[0]?.currentImageIdIndex ?? 0;
      const frame = frameIndex + 1;
      // Use ref to access latest detectionsByFrame without stale closure
      setDetectionsByFrame((prev) => {
        const dets = prev.get(frame) ?? [];
        if (dets.length > 0) {
          try { drawDetections(element, dets); } catch {}
        } else {
          try { clearOverlay(element); } catch {}
        }
        return prev;
      });
    };

    element.addEventListener("cornerstonenewimage", onNewImage);
    element.addEventListener("cornerstoneimagerendered", onImageRendered);

    cornerstone.loadAndCacheImage(imageId).then((image: any) => {
      cornerstone.displayImage(element, image);
      setImageReady(true);

      // Pan (left click drag) + Zoom (right click drag) + wheel zoom
      try {
        cornerstoneTools.addTool(cornerstoneTools.PanTool);
      } catch {}
      try {
        cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
      } catch {}
      try {
        cornerstoneTools.addTool(cornerstoneTools.ZoomMouseWheelTool);
      } catch {}
      cornerstoneTools.setToolActive("Pan", { mouseButtonMask: 1 });
      cornerstoneTools.setToolActive("Zoom", { mouseButtonMask: 2 });
      cornerstoneTools.setToolActive("ZoomMouseWheel", {});

      const numberOfFrames = parseInt(image.data.string("x00280008") || "1");
      setTotalFrames(numberOfFrames);

      if (numberOfFrames > 1) {
        const imageIds = Array.from(
          { length: numberOfFrames },
          (_, i) => `${imageId}?frame=${i + 1}`
        );
        const stack = { currentImageIdIndex: 0, imageIds };
        cornerstoneTools.addStackStateManager(element, ["stack"]);
        cornerstoneTools.addToolState(element, "stack", stack);
      }
    }).catch(console.error);

    return () => {
      element.removeEventListener("cornerstonenewimage", onNewImage);
      element.removeEventListener("cornerstoneimagerendered", onImageRendered);
      cornerstoneTools.stopClip(element);
      cornerstone.disable(element);
      setImageReady(false);
    };
  }, [selectedCine]);

  // ── Stenosis analysis ────────────────────────────────────────────────────

  const handleAnalyzeStenosis = useCallback(async () => {
    if (!selectedCine) return;
    setAnalyzing(true);
    setStenosisError(null);
    setDetectionsByFrame(new Map());
    setFramesWithDetections([]);

    try {
      const response = await axios.post<StenosisApiResponse>(
        `http://localhost:5106/api/Stenosis/analyze`,
        { instanceId: selectedCine.instanceId }
      );

      if (!response.data?.success || !response.data.detections?.length) {
        setStenosisError("Aucune sténose détectée sur cette image.");
        return;
      }

      const grouped = groupAndFilter(response.data.detections);
      setDetectionsByFrame(grouped);
      setFramesWithDetections(Array.from(grouped.keys()).sort((a, b) => a - b));
    } catch (err) {
      console.error("Erreur analyse sténose:", err);
      setStenosisError("Erreur lors de l'analyse. Vérifiez la connexion au serveur.");
    } finally {
      setAnalyzing(false);
    }
  }, [selectedCine]);

  const handleClearStenosis = () => {
    setDetectionsByFrame(new Map());
    setFramesWithDetections([]);
    setStenosisError(null);
    if (elementRef.current) clearOverlay(elementRef.current);
  };

  // Jump to a specific frame with detections
  const jumpToFrame = (frame: number) => {
    const element = elementRef.current;
    if (!element) return;

    if (isPlaying) {
      cornerstoneTools.stopClip(element);
      setIsPlaying(false);
    }

    const toolState = cornerstoneTools.getToolState(element, "stack");
    if (toolState?.data?.[0]) {
      const stack = toolState.data[0];
      const frameIndex = frame - 1;
      stack.currentImageIdIndex = frameIndex;
      setCurrentFrame(frame);

      cornerstone.loadAndCacheImage(stack.imageIds[frameIndex])
        .then((image: any) => cornerstone.displayImage(element, image))
        .catch(console.error);
    }
  };

  // ── Zoom ─────────────────────────────────────────────────────────────────

  const handleZoomIn = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.scale += 0.25;
    cornerstone.setViewport(element, viewport);
    const dets = detectionsByFrame.get(currentFrame);
    if (dets?.length) drawDetections(element, dets);
  };

  const handleZoomOut = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.scale = Math.max(0.25, viewport.scale - 0.25);
    cornerstone.setViewport(element, viewport);
    const dets = detectionsByFrame.get(currentFrame);
    if (dets?.length) drawDetections(element, dets);
  };

  const handleZoomReset = () => {
    const element = elementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    if (!viewport) return;
    viewport.scale = 1;
    viewport.translation = { x: 0, y: 0 };
    cornerstone.setViewport(element, viewport);
    const dets = detectionsByFrame.get(currentFrame);
    if (dets?.length) drawDetections(element, dets);
  };

  // ── Playback ─────────────────────────────────────────────────────────────

  const togglePlay = () => {
    const element = elementRef.current;
    if (!element) return;
    if (isPlaying) {
      cornerstoneTools.stopClip(element);
    } else {
      cornerstoneTools.playClip(element, 30);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number[]) => {
    const frameIndex = value[0] - 1;
    const element = elementRef.current;
    if (!element) return;

    if (isPlaying) {
      cornerstoneTools.stopClip(element);
      setIsPlaying(false);
    }

    const toolState = cornerstoneTools.getToolState(element, "stack");
    if (toolState?.data?.[0]) {
      const stack = toolState.data[0];
      stack.currentImageIdIndex = frameIndex;
      setCurrentFrame(value[0]);

      cornerstone.loadAndCacheImage(stack.imageIds[frameIndex])
        .then((image: any) => cornerstone.displayImage(element, image))
        .catch(console.error);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const hasDetections = detectionsByFrame.size > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Viewer */}
      <div className="flex-1 bg-black relative">
        <div ref={elementRef} className="w-full h-full min-h-[300px]" />

        {/* Frame counter */}
        {totalFrames > 1 && (
          <div className="absolute top-3 right-3 text-xs font-mono text-white/80 bg-black/60 px-2 py-1 rounded">
            Frame {currentFrame} / {totalFrames}
            {currentDetections.length > 0 && (
              <span className="ml-2 text-yellow-400">
                ● {currentDetections.length} sténose{currentDetections.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Current frame detection badges */}
        {currentDetections.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            {currentDetections.map((d, i) => {
              const color = confidenceColor(d.confidence);
              return (
                <span
                  key={i}
                  className="text-xs font-semibold px-2 py-0.5 rounded font-mono"
                  style={{
                    background: color + "22",
                    border: `1px solid ${color}`,
                    color,
                  }}
                >
                  S{i + 1} — {Math.round(d.confidence * 100)}%
                </span>
              );
            })}
          </div>
        )}

        {/* Analyzing overlay */}
        {analyzing && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 size={32} className="animate-spin text-cyan-400" />
            <span className="text-sm font-medium tracking-wide">Analyse en cours…</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {stenosisError && (
        <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-t border-destructive/20 text-sm text-destructive">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{stenosisError}</span>
          <button onClick={() => setStenosisError(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Frames with detections — quick navigation chips */}
      {hasDetections && framesWithDetections.length > 0 && (
        <div className="px-3 py-2 border-t border-border bg-muted/30 flex flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground mr-1 shrink-0">Sténoses détectées :</span>
          {framesWithDetections.map((f) => {
            const count = detectionsByFrame.get(f)?.length ?? 0;
            const isActive = f === currentFrame;
            return (
              <button
                key={f}
                onClick={() => jumpToFrame(f)}
                className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${
                  isActive
                    ? "bg-cyan-500 text-black font-bold"
                    : "bg-muted text-muted-foreground hover:bg-cyan-500/20 hover:text-cyan-600 border border-border"
                }`}
              >
                F{f} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col p-3 bg-muted/40 border-t gap-3">
        {/* Analyze / Clear + Zoom buttons */}
        {selectedCine && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleAnalyzeStenosis}
              disabled={analyzing || !imageReady}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-cyan-500/40 text-cyan-600 hover:bg-cyan-500/10"
            >
              {analyzing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ScanSearch size={13} />
              )}
              {analyzing ? "Analyse…" : "Analyser sténose"}
            </Button>

            {hasDetections && (
              <Button
                onClick={handleClearStenosis}
                size="sm"
                variant="ghost"
                className="gap-1 text-xs text-muted-foreground"
              >
                <X size={12} />
                Effacer ({Array.from(detectionsByFrame.values()).reduce((s, v) => s + v.length, 0)} boîtes, {framesWithDetections.length} frames)
              </Button>
            )}

            {/* Separator */}
            <div className="h-5 w-px bg-border mx-1" />

            {/* Zoom controls */}
            <Button
              onClick={handleZoomIn}
              disabled={!imageReady}
              size="icon"
              variant="outline"
              className="h-7 w-7"
              title="Zoom avant"
            >
              <ZoomIn size={13} />
            </Button>
            <Button
              onClick={handleZoomOut}
              disabled={!imageReady}
              size="icon"
              variant="outline"
              className="h-7 w-7"
              title="Zoom arrière"
            >
              <ZoomOut size={13} />
            </Button>
            <Button
              onClick={handleZoomReset}
              disabled={!imageReady}
              size="icon"
              variant="outline"
              className="h-7 w-7"
              title="Réinitialiser zoom"
            >
              <Maximize size={13} />
            </Button>
          </div>
        )}

        {/* Playback slider */}
        {selectedCine && totalFrames > 1 && (
          <div className="flex items-center gap-4 px-2">
            <Button onClick={togglePlay} variant="outline" size="icon" className="h-8 w-8 shrink-0">
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </Button>
            <div className="relative w-full">
              <Slider
                value={[currentFrame]}
                min={1}
                max={totalFrames}
                step={1}
                onValueChange={handleSliderChange}
                className="w-full"
              />
              {/* Detection tick marks on slider track */}
              {hasDetections && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  {framesWithDetections.map((f) => (
                    <div
                      key={f}
                      className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-sm bg-cyan-400 opacity-70"
                      style={{ left: `${((f - 1) / (totalFrames - 1)) * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedCine && totalFrames <= 1 && (
          <div className="text-center text-xs text-muted-foreground">
            Image unique (pas de frames additionnels)
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewerPanel;
