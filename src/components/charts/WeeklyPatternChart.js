import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeeklyPatternChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="day" />
      <YAxis />
      <Tooltip />
      <Bar
        dataKey="successRate"
        name="Success Rate (%)"
        fill="var(--primary-color)"
      />
    </BarChart>
  </ResponsiveContainer>
);

export default WeeklyPatternChart;
