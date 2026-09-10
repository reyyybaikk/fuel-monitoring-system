import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function FleetData() {
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const fetchVehicles = async () => {
      // Fetch all vehicles from the proper endpoint
      const res = await fetch(api.vehicles());
      const json = await res.json();
      if (json.success) setVehicles(json.data);
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

