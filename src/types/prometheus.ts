export interface MetricResult {
  labels: Record<string, string>;
  timestamp: number;
  value: number;
}

export interface HealthMetrics {
  clusterHealthy: boolean;
  apiServerUp: boolean;
  nodeCount: number;
  nodesReady: number;
  podCount: number;
  podsRunning: number;
  timestamp: number;
}

export interface PrometheusStatusData {
  connected: boolean;
  timestamp: string;
}
