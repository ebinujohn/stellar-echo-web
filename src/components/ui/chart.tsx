"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  tooltipStyle,
  legendStyle,
  gridStyle,
  axisStyle,
} from "@/lib/charts/config";

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  height?: number;
}

/**
 * Responsive container wrapper for all charts
 * Handles consistent sizing and responsive behavior
 */
export function ChartContainer({
  children,
  className,
  height = 350,
}: ChartContainerProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Styled CartesianGrid for line/bar/area charts
 * Automatically adapts to dark/light mode
 */
export function ChartGrid() {
  return <CartesianGrid {...gridStyle} />;
}

/**
 * Styled XAxis with theme support
 */
interface ChartXAxisProps {
  dataKey: string;
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tickFormatter?: (value: any) => string;
  angle?: number;
  height?: number;
}

export function ChartXAxis({
  dataKey,
  label,
  tickFormatter,
  angle = 0,
  height,
}: ChartXAxisProps) {
  return (
    <XAxis
      dataKey={dataKey}
      {...axisStyle}
      tick={{ fill: axisStyle.stroke }}
      tickFormatter={tickFormatter}
      angle={angle}
      textAnchor={angle !== 0 ? "end" : "middle"}
      height={height}
      label={
        label
          ? {
              value: label,
              position: "insideBottom",
              offset: -5,
              style: { fill: axisStyle.stroke, fontSize: axisStyle.fontSize },
            }
          : undefined
      }
    />
  );
}

/**
 * Styled YAxis with theme support
 */
interface ChartYAxisProps {
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tickFormatter?: (value: any) => string;
  width?: number;
  domain?: [number | string, number | string];
}

export function ChartYAxis({
  label,
  tickFormatter,
  width = 60,
  domain,
}: ChartYAxisProps) {
  return (
    <YAxis
      {...axisStyle}
      tick={{ fill: axisStyle.stroke }}
      tickFormatter={tickFormatter}
      width={width}
      domain={domain}
      label={
        label
          ? {
              value: label,
              angle: -90,
              position: "insideLeft",
              style: { fill: axisStyle.stroke, fontSize: axisStyle.fontSize },
            }
          : undefined
      }
    />
  );
}

/**
 * Styled Tooltip with theme support
 */
interface ChartTooltipProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (value: any, name: string, props: any) => React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labelFormatter?: (label: any) => React.ReactNode;
}

export function ChartTooltip({ formatter, labelFormatter }: ChartTooltipProps) {
  return (
    <Tooltip
      {...tooltipStyle}
      formatter={formatter}
      labelFormatter={labelFormatter}
    />
  );
}

/**
 * Styled Legend with theme support
 */
interface ChartLegendProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (value: string, entry: any, index: number) => React.ReactNode;
  verticalAlign?: "top" | "middle" | "bottom";
  align?: "left" | "center" | "right";
}

export function ChartLegend({
  formatter,
  verticalAlign = "bottom",
  align = "center",
}: ChartLegendProps) {
  return (
    <Legend
      {...legendStyle}
      formatter={formatter}
      verticalAlign={verticalAlign}
      align={align}
    />
  );
}

/**
 * Empty state for charts with no data
 */
interface ChartEmptyStateProps {
  message?: string;
  height?: number;
}

export function ChartEmptyState({
  message = "No data available",
  height = 350,
}: ChartEmptyStateProps) {
  return (
    <div
      className="flex items-center justify-center border border-dashed rounded-lg bg-muted/50"
      style={{ height }}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Loading state for charts
 */
interface ChartLoadingStateProps {
  height?: number;
}

export function ChartLoadingState({ height = 350 }: ChartLoadingStateProps) {
  return (
    <div
      className="flex items-center justify-center border border-dashed rounded-lg bg-muted/50 animate-pulse"
      style={{ height }}
    >
      <p className="text-sm text-muted-foreground">Loading chart...</p>
    </div>
  );
}
