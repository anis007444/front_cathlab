import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, Layers, Calendar, Activity } from "lucide-react";
import { DicomStudy, DicomSeries, DicomCine } from "@/types/dicom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import CineList from "./CineList";

interface Props {
  study: DicomStudy;
  selectedCineId: string | null;
  onSelectCine: (cine: DicomCine, series: DicomSeries) => void;
}

const DicomTree = ({ study, selectedCineId, onSelectCine }: Props) => {
  const [expandedStudy, setExpandedStudy] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries((prev) => ({ ...prev, [seriesId]: !prev[seriesId] }));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1 text-sm">
        {/* Study node */}
        <button
          onClick={() => setExpandedStudy(!expandedStudy)}
          className="flex items-center gap-2 w-full rounded-md px-2 py-2 hover:bg-accent/50 transition-colors text-left"
        >
          {expandedStudy ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
          <Folder size={16} className="text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground truncate block">{study.description}</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Calendar size={10} />
              <span>{study.date}</span>
              <Activity size={10} />
              <span>{study.modality}</span>
            </div>
          </div>
        </button>

        {/* Series nodes */}
        {expandedStudy && (
          <div className="ml-4 space-y-0.5 animate-fade-in">
            {study.series.map((series) => {
              const isExpanded = expandedSeries[series.seriesId];
              const hasSelectedCine = series.cines.some((c) => c.instanceId === selectedCineId);

              return (
                <div key={series.seriesId}>
                  <button
                    onClick={() => toggleSeries(series.seriesId)}
                    className={cn(
                      "flex items-center gap-2 w-full rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors text-left",
                      hasSelectedCine && "bg-accent/30"
                    )}
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
                    <Layers size={15} className="text-amber-500 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground truncate block text-xs">
                        S{series.seriesNumber} – {series.description}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {series.cines.length} cine{series.cines.length > 1 ? "s" : ""} · {series.modality}
                      </span>
                    </div>
                  </button>

                  {/* Cine list */}
                  {isExpanded && (
                    <div className="ml-6 animate-fade-in">
                      <CineList
                        cines={series.cines}
                        selectedCineId={selectedCineId}
                        onSelectCine={(cine) => onSelectCine(cine, series)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default DicomTree;