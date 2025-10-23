/**
 * analyticsService.ts
 * Aggregates metrics from Brain Cloud and generates analytics
 */

import type { DashboardSnapshot, DashboardTask } from "./apiClient";

export interface TaskMetrics {
  total: number;
  completed: number;
  overdue: number;
  today: number;
  upcoming: number;
  completionRate: number;
  velocity: number; // completed per day
  priorityBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export interface AreaMetrics {
  name: string;
  taskCount: number;
  completedCount: number;
  completionRate: number;
  focusTime: number; // minutes
  lastActivity: string;
}

export interface TimelineMetrics {
  date: string;
  tasksCompleted: number;
  notesCreated: number;
  insightsGenerated: number;
  activeTime: number;
}

export interface KnowledgeMetrics {
  totalNotes: number;
  totalConnections: number;
  avgConnectionsPerNote: number;
  densityScore: number; // 0-1
  clusters: number;
  orphanedNotes: number;
}

export interface AnalyticsData {
  taskMetrics: TaskMetrics;
  areaMetrics: AreaMetrics[];
  knowledgeMetrics: KnowledgeMetrics;
  timeline: TimelineMetrics[];
  generatedAt: string;
}

export class AnalyticsService {
  /**
   * Calculate task metrics
   */
  static calculateTaskMetrics(tasks: DashboardTask[]): TaskMetrics {
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => t.status === "overdue").length;
    const today = tasks.filter((t) => t.status === "today").length;
    const upcoming = tasks.filter((t) => t.status === "upcoming").length;

    const priorityBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {
      overdue,
      today,
      upcoming,
      completed,
    };

    tasks.forEach((task) => {
      const priority = task.priority || "none";
      priorityBreakdown[priority] = (priorityBreakdown[priority] || 0) + 1;
    });

    return {
      total: tasks.length,
      completed,
      overdue,
      today,
      upcoming,
      completionRate: tasks.length > 0 ? completed / tasks.length : 0,
      velocity: completed, // simplified: per current period
      priorityBreakdown,
      statusBreakdown,
    };
  }

  /**
   * Calculate area metrics from tasks/projects
   */
  static calculateAreaMetrics(tasks: DashboardTask[]): AreaMetrics[] {
    const areas: Record<string, AreaMetrics> = {};
    const defaultAreas = [
      { name: "IA", taskCount: 0, completedCount: 0 },
      { name: "Agro", taskCount: 0, completedCount: 0 },
      { name: "Crypto", taskCount: 0, completedCount: 0 },
      { name: "Outros", taskCount: 0, completedCount: 0 },
    ];

    defaultAreas.forEach((area) => {
      areas[area.name] = {
        ...area,
        completionRate: 0,
        focusTime: 0,
        lastActivity: new Date().toISOString(),
      };
    });

    // Map tasks to areas based on tags/project
    tasks.forEach((task) => {
      const area = this.mapTaskToArea(task);
      if (areas[area]) {
        areas[area].taskCount += 1;
        if (task.status === "completed") {
          areas[area].completedCount += 1;
        }
      }
    });

    // Calculate rates
    Object.values(areas).forEach((area) => {
      area.completionRate =
        area.taskCount > 0 ? area.completedCount / area.taskCount : 0;
    });

    return Object.values(areas);
  }

  /**
   * Map task to area based on tags/project
   */
  static mapTaskToArea(task: DashboardTask): string {
    const tags = task.tags || [];
    const project = task.project || "";

    if (
      tags.some((t) => t.toLowerCase().includes("ia")) ||
      project.toLowerCase().includes("ia")
    ) {
      return "IA";
    }
    if (
      tags.some((t) => t.toLowerCase().includes("agro")) ||
      project.toLowerCase().includes("agro")
    ) {
      return "Agro";
    }
    if (
      tags.some((t) => t.toLowerCase().includes("crypto")) ||
      project.toLowerCase().includes("crypto")
    ) {
      return "Crypto";
    }
    return "Outros";
  }

  /**
   * Calculate knowledge graph metrics
   */
  static calculateKnowledgeMetrics(
    graphData: Record<string, unknown>
  ): KnowledgeMetrics {
    const nodes = (graphData.nodes as Array<{ id: string }>) || [];
    const edges = (graphData.edges as Array<{ source: string; target: string }>) || [];

    const connectionCount: Record<string, number> = {};
    let totalConnections = 0;

    edges.forEach((edge) => {
      connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
      totalConnections += 1;
    });

    const avgConnectionsPerNote =
      nodes.length > 0 ? totalConnections / nodes.length : 0;
    const orphanedNotes = Object.values(nodes).filter(
      (node: any) => !connectionCount[node.id]
    ).length;

    return {
      totalNotes: nodes.length,
      totalConnections,
      avgConnectionsPerNote,
      densityScore: this.calculateDensity(nodes.length, totalConnections),
      clusters: this.estimateClusters(nodes.length, totalConnections),
      orphanedNotes,
    };
  }

  /**
   * Calculate density of graph (0-1)
   */
  static calculateDensity(nodes: number, edges: number): number {
    if (nodes < 2) return 0;
    const maxEdges = (nodes * (nodes - 1)) / 2;
    return edges / maxEdges;
  }

  /**
   * Estimate number of clusters
   */
  static estimateClusters(nodes: number, edges: number): number {
    if (nodes === 0) return 0;
    if (edges === 0) return nodes;
    // Simplified: connected components = nodes - edges (rough estimate)
    return Math.max(1, Math.ceil(nodes - edges / 5));
  }

  /**
   * Generate timeline metrics
   */
  static generateTimeline(
    tasks: DashboardTask[],
    days: number = 7
  ): TimelineMetrics[] {
    const timeline: TimelineMetrics[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      timeline.push({
        date: dateStr,
        tasksCompleted: Math.floor(Math.random() * 5), // placeholder
        notesCreated: Math.floor(Math.random() * 3),
        insightsGenerated: Math.floor(Math.random() * 2),
        activeTime: Math.floor(Math.random() * 480) + 60, // 1-8 hours in minutes
      });
    }

    return timeline;
  }

  /**
   * Aggregate all analytics
   */
  static aggregateAnalytics(
    snapshot: DashboardSnapshot,
    graphData: Record<string, unknown>
  ): AnalyticsData {
    const tasks = snapshot.data?.tasks?.simplified || [];

    return {
      taskMetrics: this.calculateTaskMetrics(tasks),
      areaMetrics: this.calculateAreaMetrics(tasks),
      knowledgeMetrics: this.calculateKnowledgeMetrics(graphData),
      timeline: this.generateTimeline(tasks),
      generatedAt: new Date().toISOString(),
    };
  }
}

export default AnalyticsService;
