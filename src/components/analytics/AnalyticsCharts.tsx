"use client";

import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TaskMetrics, AreaMetrics, TimelineMetrics } from "../../services/analyticsService";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ─────────────────────────────────────────────────────────────
// Tasks Distribution (Pie Chart)
// ─────────────────────────────────────────────────────────────

interface TaskPieChartProps {
  metrics: TaskMetrics;
}

export function TaskPieChart({ metrics }: TaskPieChartProps) {
  const data = [
    { name: "Concluídas", value: metrics.completed },
    { name: "Hoje", value: metrics.today },
    { name: "Em atraso", value: metrics.overdue },
    { name: "Próximas", value: metrics.upcoming },
  ];

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4">Distribuição de Tarefas</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Priority Breakdown (Bar Chart)
// ─────────────────────────────────────────────────────────────

interface PriorityBarChartProps {
  metrics: TaskMetrics;
}

export function PriorityBarChart({ metrics }: PriorityBarChartProps) {
  const data = Object.entries(metrics.priorityBreakdown).map(
    ([priority, count]) => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count,
    })
  );

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4">Tarefas por Prioridade</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="priority" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
          <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Area Distribution (Pie Chart)
// ─────────────────────────────────────────────────────────────

interface AreaPieChartProps {
  areas: AreaMetrics[];
}

export function AreaPieChart({ areas }: AreaPieChartProps) {
  const data = areas.map((area) => ({
    name: area.name,
    value: area.taskCount,
  }));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4">Distribuição por Área</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Completion Rate by Area (Bar Chart)
// ─────────────────────────────────────────────────────────────

interface AreaCompletionChartProps {
  areas: AreaMetrics[];
}

export function AreaCompletionChart({ areas }: AreaCompletionChartProps) {
  const data = areas.map((area) => ({
    name: area.name,
    rate: Math.round(area.completionRate * 100),
  }));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4">Taxa de Conclusão por Área (%)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
          <Bar dataKey="rate" fill="#10b981" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Activity Timeline (Area Chart)
// ─────────────────────────────────────────────────────────────

interface TimelineChartProps {
  timeline: TimelineMetrics[];
}

export function TimelineChart({ timeline }: TimelineChartProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4">Atividade Últimos 7 Dias</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={timeline}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
          <Legend />
          <Area
            type="monotone"
            dataKey="tasksCompleted"
            stackId="1"
            stroke="#3b82f6"
            fill="#3b82f6"
            name="Tarefas Completas"
          />
          <Area
            type="monotone"
            dataKey="notesCreated"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            name="Notas Criadas"
          />
          <Area
            type="monotone"
            dataKey="insightsGenerated"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            name="Insights"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Active Time by Day (Line Chart)
// ─────────────────────────────────────────────────────────────

interface ActiveTimeChartProps {
  timeline: TimelineMetrics[];
}

export function ActiveTimeChart({ timeline }: ActiveTimeChartProps) {
  const data = timeline.map((item) => ({
    date: item.date,
    hours: Math.round(item.activeTime / 60),
  }));

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4">Tempo Ativo por Dia (horas)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
          <Line
            type="monotone"
            dataKey="hours"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: "#8b5cf6", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
