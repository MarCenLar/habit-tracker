import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CategoryBalanceChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <RadarChart cx="50%" cy="50%" outerRadius="80%">
      <PolarGrid />
      <PolarAngleAxis dataKey="name" />
      <PolarRadiusAxis angle={30} domain={[0, 100]} />
      <Radar
        name="Success Rate"
        dataKey="rate"
        data={data}
        stroke="var(--primary-color)"
        fill="var(--primary-color)"
        fillOpacity={0.6}
      />
      <Tooltip />
    </RadarChart>
  </ResponsiveContainer>
);

export default CategoryBalanceChart;
