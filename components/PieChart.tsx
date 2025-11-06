import React from 'react';

interface PieChartProps {
  data: {
    value: number;
    color: string;
    label: string;
  }[];
  size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 100 }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center">
            <svg width={size} height={size} viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#e2e8f0" strokeWidth="3.8"></circle>
                 <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="6" className="fill-current text-slate-500">No Data</text>
            </svg>
        </div>
    );
  }

  let accumulatedPercentage = 0;
  const radius = 15.91549430918954;

  return (
    <div style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 42 42" role="img" aria-label="Pie chart of call statuses">
        <title>Call Status Breakdown</title>
        <circle cx="21" cy="21" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="3.8"></circle>
        {data.map((item, index) => {
            if (item.value <= 0) return null;
            const percentage = (item.value / total) * 100;
            const dasharray = `${percentage} ${100 - percentage}`;
            const offset = 25 - accumulatedPercentage;
            accumulatedPercentage += percentage;

            return (
            <g key={index}>
                <title>{`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}</title>
                <circle
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth="3.8"
                    strokeDasharray={dasharray}
                    strokeDashoffset={offset}
                ></circle>
            </g>
            );
        })}
        </svg>
    </div>
  );
};

export default PieChart;
