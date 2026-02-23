"use client";

import { useMemo } from "react";
import { Chart } from "react-google-charts";

type ActivityShare = {
  title: string;
  minutes: number;
};

type ActivityPieChartProps = {
  data: ActivityShare[];
};

export default function ActivityPieChart({ data }: ActivityPieChartProps) {
  // ako nema podataka, nema ni grafikona
  if (!data || data.length === 0) return null;

  // pripremi podatke za Google Chart
  const chartData = useMemo(
    () => [
      ["Aktivnost", "Minuta"],
      ...data.map((a) => [a.title, a.minutes]),
    ],
    [data]
  );

  const options = {
    title: "Udeo aktivnosti u radnom vremenu",
    legend: { position: "right" as const },
    chartArea: { width: "80%", height: "80%" },
    pieHole: 0, // 0 = običan pie; stavi 0.4 za donut
    sliceVisibilityThreshold: 0, // prikaži i male "slice"-ove
  };

  return (
    <div className="mt-4">
      <Chart
        chartType="PieChart"
        width="100%"
        height="300px"
        data={chartData}
        options={options}
        loader={<div>Učitavanje grafikona…</div>}
      />
    </div>
  );
}