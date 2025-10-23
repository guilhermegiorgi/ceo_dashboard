"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsWidgetProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, value, trend = "neutral", icon }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-emerald-400" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-rose-400" />;
      default:
        return <Minus className="h-3 w-3 text-zinc-400" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-emerald-400";
      case "down":
        return "text-rose-400";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="p-1 bg-zinc-700 rounded">
              {icon}
            </div>
          )}
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {title}
          </h3>
        </div>
        {trend !== "neutral" && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
          </div>
        )}
      </div>
      
      <div className={`text-2xl font-bold ${getTrendColor()}`}>
        {value}
      </div>
      
      {trend !== "neutral" && (
        <div className="mt-1 text-xs text-zinc-400">
          {trend === "up" && "↑ crescimento"}
          {trend === "down" && "↓ redução"}
        </div>
      )}
    </div>
  );
};

export default StatsWidget;
