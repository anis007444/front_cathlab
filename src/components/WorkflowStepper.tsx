import { Check } from "lucide-react";

const STEPS = [
  "Patient & Study",
  "DICOM Viewer",
  "Intervention",
  "Treatment",
  "Results",
  "Schéma Coronaire",
  "Review & Save",
];

interface WorkflowStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const WorkflowStepper = ({ currentStep, onStepClick }: WorkflowStepperProps) => {
  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isCompleted = stepNum < currentStep;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => onStepClick?.(stepNum)}
                disabled={!onStepClick}
                className="flex flex-col items-center gap-1.5 group cursor-pointer disabled:cursor-default"
              >
                <div
                  className={`step-indicator ${isActive
                    ? "step-active"
                    : isCompleted
                      ? "step-completed"
                      : "step-pending"
                    }`}
                >
                  {isCompleted ? <Check size={16} /> : stepNum}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block transition-colors ${isActive
                    ? "text-primary"
                    : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                    }`}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={`h-0.5 rounded-full transition-colors duration-300 ${isCompleted ? "bg-primary" : "bg-border"
                      }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStepper;
