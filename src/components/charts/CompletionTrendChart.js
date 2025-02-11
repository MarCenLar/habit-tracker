import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CompletionTrendChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Area
        type="monotone"
        dataKey="rate"
        stroke="var(--primary-color)"
        fill="var(--primary-color)"
        fillOpacity={0.2}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default CompletionTrendChart;
