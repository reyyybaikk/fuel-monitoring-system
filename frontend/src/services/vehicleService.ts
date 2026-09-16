import api from './api';

export interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_type: string;
  fuel_tank_capacity: number;
  fuel_consumption_rate: number;
  is_active: boolean;
  ul_nd?: string;
  ul_pln?: string;
}

export const getVehicles = async (search?: string, ul_nd?: string): Promise<Vehicle[]> => {
  // Membersihkan prefix agar pencarian di database (Banjarmasin, Barabai, dsb) sukses
  const cleanRegion = ul_nd?.replace('Unit Layanan ', '').trim();

  const response = await api.get('/api/vehicles', {
    params: {
      search,
      ul_nd: cleanRegion,
      limit: 100
    }
  });
  return response.data.data;
};

export const createVehicle = async (vehicleData: Partial<Vehicle>) => {
  const response = await api.post('/api/vehicles', vehicleData);
  return response.data;
};
