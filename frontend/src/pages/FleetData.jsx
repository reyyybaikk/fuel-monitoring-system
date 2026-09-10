import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function FleetData() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      // No dedicated endpoint, reuse vehicle verification for all vehicles (placeholder)
      // In real app you would have an endpoint like /api/vehicles
      const res = await fetch(api.transactions()); // temporary reuse
      const json = await res.json();
      if (json.success) setVehicles(json.data.map(d => d.vehicle_id));
    };
    fetchVehicles();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Data Armada & Legalitas</h1>
      <ul className="list-disc pl-6">
        {vehicles.map((v, i) => (
          <li key={i}>Vehicle ID: {v}</li>
        ))}
      </ul>
    </div>
  );
}

