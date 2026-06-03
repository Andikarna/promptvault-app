'use client';

import React, { useEffect, useState } from 'react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';
import { Prompt, ActivityLog } from '@/lib/types';

interface DashboardChartsProps {
  prompts: Prompt[];
  activities: ActivityLog[];
}

const COLORS = [
  '#4A6B53', // Sage Green
  '#6E9C7C', // Soft Sage
  '#899D90', // Muted Green
  '#A3B899', // Creamy Sage
  '#5C6B60', // Deep Muted Green
  '#2D4836', // Dark Forest Green
  '#BCE3C5', // Soft Mint
  '#C7D3C4', // Soft Grey-Green
];

export default function DashboardCharts({ prompts, activities }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-64 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white/40 dark:bg-[#1D2620]/20 animate-pulse flex items-center justify-center text-[#5C6B60]">Loading analysis charts...</div>
        <div className="h-64 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white/40 dark:bg-[#1D2620]/20 animate-pulse flex items-center justify-center text-[#5C6B60]">Loading analysis charts...</div>
        <div className="h-64 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white/40 dark:bg-[#1D2620]/20 animate-pulse flex items-center justify-center text-[#5C6B60]">Loading analysis charts...</div>
      </div>
    );
  }

  // 1. Process categories data
  const categoryCounts: { [key: string]: number } = {};
  prompts.forEach(p => {
    const cat = p.category || 'Uncategorized';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  
  const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  })).sort((a, b) => b.value - a.value);

  // 2. Process AI Tool Usage
  const toolCounts: { [key: string]: number } = {};
  prompts.forEach(p => {
    const tool = p.aiTool || 'Unspecified';
    toolCounts[tool] = (toolCounts[tool] || 0) + 1;
  });

  const toolData = Object.entries(toolCounts).map(([name, count]) => ({
    name: name.length > 12 ? `${name.substring(0, 12)}...` : name,
    count,
  })).sort((a, b) => b.count - a.count);

  // 3. Process Activity (Last 7 days)
  const activityData = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    // Count activities on this date
    const count = activities.filter(act => {
      const actDateStr = new Date(act.timestamp).toISOString().split('T')[0];
      return actDateStr === dateStr;
    }).length;

    activityData.push({
      date: label,
      activity: count,
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Category Chart */}
      <div className="p-5 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col">
        <h3 className="text-sm font-semibold text-[#222E26] dark:text-[#F7F6F0] mb-4">Prompts by Category</h3>
        {categoryData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[#5C6B60] dark:text-[#899D90] py-12">No category data yet</div>
        ) : (
          <div className="h-48 w-full flex items-center justify-between">
            <div className="w-[50%] h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={66}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card)', 
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend */}
            <div className="w-[50%] flex flex-col gap-1.5 pl-4 max-h-full overflow-y-auto text-[11px]">
              {categoryData.slice(0, 5).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate text-[#5C6B60] dark:text-[#899D90]" title={entry.name}>{entry.name} ({entry.value})</span>
                </div>
              ))}
              {categoryData.length > 5 && (
                <div className="text-[10px] text-[#5C6B60]/80 dark:text-[#899D90]/80 font-medium pl-4">+{categoryData.length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Tool Usage Chart */}
      <div className="p-5 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col">
        <h3 className="text-sm font-semibold text-[#222E26] dark:text-[#F7F6F0] mb-4">AI Tool Distribution</h3>
        {toolData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-[#5C6B60] dark:text-[#899D90] py-12">No AI tool statistics</div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toolData} margin={{ top: 10, right: 5, left: -22, bottom: 20 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(74, 107, 83, 0.05)' }}
                  contentStyle={{ 
                    background: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="count" fill="url(#sageBarGrad)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="sageBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Activity Chart */}
      <div className="p-5 rounded-xl border border-[#DFDCD0]/60 dark:border-[#2E3D33]/60 bg-white dark:bg-[#1D2620] shadow-sm flex flex-col md:col-span-2 lg:col-span-1">
        <h3 className="text-sm font-semibold text-[#222E26] dark:text-[#F7F6F0] mb-4">Prompt Activity (7d)</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 10, right: 5, left: -22, bottom: 20 }}>
              <defs>
                <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ 
                  background: 'var(--card)', 
                  borderColor: 'var(--border)',
                  borderRadius: '8px',
                  color: 'var(--foreground)',
                  fontSize: '12px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="activity" 
                stroke="var(--primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorActivity)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

