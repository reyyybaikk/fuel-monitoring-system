import api from './api';

export interface DashboardSummary {
  total_liters: number;
  total_cost: number;
  active_vehicles: number;
  total_vehicles: number;
  anomaly_count: number;
  liter_change_percentage: number;
  cost_change_percentage: number;
  recent_anomalies: {
    id: string;
    plate: string;
    score: number;
    notes: string;
  }[];
  chart_data: {
    day: string;
    value: number;
    is_anomaly: boolean;
  }[];
}

export const getDashboardSummary = async (range: string = '7d'): Promise<{ success: boolean; data: DashboardSummary }> => {
  const response = await api.get('/api/fuel-transactions/summary', {
    params: { range }
  });
  return response.data;
};
