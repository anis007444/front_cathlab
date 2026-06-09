import { Film, Play } from "lucide-react";
import { DicomCine } from "@/types/dicom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  cines: DicomCine[];
  selectedCineId: string | null;
  onSelectCine: (cine: DicomCine) => void;
}

const CineList = ({ cines, selectedCineId, onSelectCine }: Props) => {
  return (
    <ScrollArea className="max-h-[200px]">
      <div className="space-y-1 py-1 px-1">
        {cines.map((cine) => {
          const isSelected = selectedCineId === cine.instanceId;
          return (
            <button
              key={cine.instanceId}
              onClick={() => onSelectCine(cine)}
              className={cn(
                "flex items-center gap-2.5 w-full rounded-md px-2 py-2 hover:bg-accent/50 transition-colors text-left",
                isSelected
                  ? "bg-primary/15 ring-1 ring-primary/30"
                  : ""
              )}
            >
              {/* Thumbnail placeholder */}
              <div
                className={cn(
                  "w-10 h-10 rounded bg-gradient-to-br from-muted to-muted/60 border flex items-center justify-center shrink-0",
                  isSelected ? "border-primary/40" : "border-border"
                )}
              >
                {isSelected ? (
                  <Play size={14} className="text-primary" />
                ) : (
                  <Film size={14} className="text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-xs font-medium truncate",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {cine.label}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {cine.numberOfFrames} frames
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default CineList;
