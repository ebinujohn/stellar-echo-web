/**
 * Chart configuration and theming utilities
 * Provides consistent colors and styles across all charts
 */

export const chartColors = {
  primary: "hsl(var(--chart-1))",
  secondary: "hsl(var(--chart-2))",
  tertiary: "hsl(var(--chart-3))",
  quaternary: "hsl(var(--chart-4))",
  quinary: "hsl(var(--chart-5))",
} as const;

export const chartPalette = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.tertiary,
  chartColors.quaternary,
  chartColors.quinary,
];

// Sentiment-specific colors
export const sentimentColors = {
  positive: "hsl(142, 76%, 36%)", // Green
  neutral: "hsl(43, 74%, 66%)", // Yellow
  negative: "hsl(0, 84%, 60%)", // Red
  mixed: "hsl(197, 37%, 24%)", // Blue-grey
} as const;

// Status-specific colors
export const statusColors = {
  completed: "hsl(142, 76%, 36%)",
  failed: "hsl(0, 84%, 60%)",
  in_progress: "hsl(43, 74%, 66%)",
  no_answer: "hsl(220, 70%, 50%)",
  busy: "hsl(280, 65%, 60%)",
  voicemail: "hsl(197, 37%, 24%)",
} as const;

// Common chart config for Recharts
export const commonChartConfig = {
  margin: { top: 10, right: 10, left: 0, bottom: 0 },
};

// Grid styling for dark/light mode compatibility
export const gridStyle = {
  stroke: "hsl(var(--border))",
  strokeOpacity: 0.3,
  strokeDasharray: "3 3",
};

// Axis styling
export const axisStyle = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 12,
  fontFamily: "inherit",
};

// Tooltip styling
export const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    padding: "8px 12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  },
  labelStyle: {
    color: "hsl(var(--popover-foreground))",
    fontWeight: 600,
    marginBottom: "4px",
  },
  itemStyle: {
    color: "hsl(var(--popover-foreground))",
    fontSize: "12px",
  },
};

// Legend styling
export const legendStyle = {
  wrapperStyle: {
    paddingTop: "20px",
    fontSize: "12px",
  },
  iconType: "circle" as const,
};
