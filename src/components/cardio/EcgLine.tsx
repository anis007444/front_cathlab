interface EcgLineProps {
  className?: string;
  strokeWidth?: number;
}

const EcgLine = ({ className, strokeWidth = 2 }: EcgLineProps) => (
  <svg
    viewBox="0 0 600 80"
    fill="none"
    preserveAspectRatio="none"
    className={className}
  >
    <defs>
      <linearGradient id="ecg-gradient" x1="0" x2="1">
        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
        <stop offset="50%" stopColor="hsl(var(--destructive))" stopOpacity="1" />
        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d="M0,40 L80,40 L100,40 L110,20 L120,60 L130,10 L140,70 L150,40 L220,40 L240,40 L250,25 L260,55 L270,15 L280,65 L290,40 L360,40 L380,40 L390,28 L400,52 L410,18 L420,62 L430,40 L500,40 L600,40"
      stroke="url(#ecg-gradient)"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1000"
      strokeDashoffset="1000"
      className="animate-ecg-draw"
    />
  </svg>
);

export default EcgLine