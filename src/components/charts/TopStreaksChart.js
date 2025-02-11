    import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TopStreaksChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data} layout="vertical">
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis dataKey="name" type="category" width={150} />
      <Tooltip />
      <Bar dataKey="streak" name="Current Streak" fill="var(--success-color)" />
    </BarChart>
  </ResponsiveContainer>
);

export default TopStreaksChart;
