"use client";

import { DashboardDataProvider } from "../contexts/DashboardDataContext";
import BusinessIntelligenceHub from "./BusinessIntelligenceHub";

export default function BusinessIntelligenceHubWrapper() {
  return (
    <DashboardDataProvider>
      <BusinessIntelligenceHub />
    </DashboardDataProvider>
  );
}
