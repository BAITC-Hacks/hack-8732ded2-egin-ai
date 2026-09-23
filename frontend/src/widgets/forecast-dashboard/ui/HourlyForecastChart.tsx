import type { FarmHourlyBusinessImpact } from "@/entities/wind-farm/model/types";
import type { ReactElement } from "react";

interface HourlyForecastChartProps {
  points: FarmHourlyBusinessImpact[];
}

function formatHour(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function HourlyForecastChart({ points }: HourlyForecastChartProps): ReactElement {
  const width = 760;
  const height = 230;
  const padding = 28;
  const maxPower = Math.max(...points.map((point) => point.forecastPower_kW), 1);
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const coordinate = (value: number, index: number): string => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * chartWidth;
    const y = height - padding - (value / maxPower) * chartHeight;
    return `${x},${y}`;
  };
  const line = points.map((point, index) => coordinate(point.forecastPower_kW, index)).join(" ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Forecast power, kW</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cyan-500" /> predicted generation</span>
      </div>
      <svg className="h-auto w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Hourly wind farm power forecast">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="hsl(var(--border))" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="hsl(var(--border))" />
        <polyline points={line} fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const [x, y] = coordinate(point.forecastPower_kW, index).split(",");
          return <circle key={point.timestamp} cx={x} cy={y} r="3.5" fill={point.confidence === "low" ? "#ef4444" : "#06b6d4"} />;
        })}
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{points[0] === undefined ? "—" : formatHour(points[0].timestamp)}</span>
        <span>{points[Math.floor(points.length / 2)] === undefined ? "—" : formatHour(points[Math.floor(points.length / 2)].timestamp)}</span>
        <span>{points[points.length - 1] === undefined ? "—" : formatHour(points[points.length - 1].timestamp)}</span>
      </div>
    </div>
  );
}
