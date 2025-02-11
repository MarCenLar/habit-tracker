import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HabitCorrelationChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <ScatterChart>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        type="number" 
        dataKey="streak" 
        name="Streak" 
        unit=" days"
      />
      <YAxis 
        type="number" 
        dataKey="completionRate" 
        name="Completion Rate" 
        unit="%" 
      />
      <ZAxis 
        type="number" 
        dataKey="totalCompletions" 
        range={[100, 500]} 
      />
      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
      <Legend />
      <Scatter 
        name="Habits" 
        data={data}
        fill="var(--primary-color)"
      />
    </ScatterChart>
  </ResponsiveContainer>
);

export default HabitCorrelationChart;
