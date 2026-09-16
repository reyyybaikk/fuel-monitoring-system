import api from './api';

export interface FuelTransaction {
  id: string;
  vehicle_id: number;
  license_plate: string;
  vehicle_type: string;
  driver_name: string;
  fuel_amount: number;
  odometer: number;
  total_cost: number;
  fuel_type: string;
  status: 'PENDING' | 'REVIEW' | 'APPROVED' | 'REJECTED';
  ml_is_anomaly: boolean;
  ml_anomaly_score: number;
  notes: string;
  receipt_photo_path: string;
  odometer_photo_path: string;
  odometer_after_photo_path: string;
  whatsapp_number?: string;
  created_at: string;
}

export const getTransactions = async (search?: string, filters?: any): Promise<FuelTransaction[]> => {
  const response = await api.get('/api/fuel-transactions/history', {
    params: { search, ...filters, limit: 50 }
  });
  return response.data.data;
};

export const exportTransactionsPDF = async (filters: any) => {
  const response = await api.get('/api/fuel-transactions/export-pdf', {
    params: filters,
    responseType: 'blob'
  });
  return response.data;
};

export const getTransactionById = async (id: string): Promise<FuelTransaction> => {
  const response = await api.get(`/api/fuel-transactions/${id}`);
  return response.data.data;
};

export const updateTransactionStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
  const response = await api.patch(`/api/fuel-transactions/${id}/status`, { status });
  return response.data.data;
};

export const updateTransactionData = async (id: string, data: Partial<FuelTransaction>) => {
  const response = await api.put(`/api/fuel-transactions/${id}`, data);
  return response.data.data;
};
