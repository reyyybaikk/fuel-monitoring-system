import api from './api';

export interface DashboardSummary {
  total_liters: number;
  total_cost: number;
  active_vehicles: number;
  total_vehicles: number;
  anomaly_count: number;
  avg_efficiency: number;
  tickets: {
    pending_tickets: number;
    investigation_tickets: number;
    completed_tickets: number;
  };
  allocation: {
    label: string;
    value: number;
  }[];
  chart_data: {
    label: string;
    value: number;
    anomaly_value: number;
  }[];
  recent_activities: any[];
  map_markers: {
    label: string;
    region: string;
    vehicle_count: number;
    anomaly_count: number;
    lat: number;
    lng: number;
  }[];
}

export const getDashboardSummary = async (range: string = '7d'): Promise<{ success: boolean; data: DashboardSummary }> => {
  const response = await api.get('/api/fuel-transactions/summary', {
    params: { range }
  });
  return response.data;
};
