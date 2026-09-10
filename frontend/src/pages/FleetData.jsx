import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function FleetData() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const res = await fetch(api.vehicles());
        const json = await res.json();
        console.log('🚚 fetched vehicles →', json);
        if (json.success) {
          setVehicles(json.data);
        } else {
          setError(json.message || 'Failed to fetch vehicles');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  if (loading) {
    return <p className="p-6">Memuat data armada…</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">Error: {error}</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Data Armada &amp; Legalitas</h1>
      <ul className="list-disc pl-6">
        {vehicles.map((v) => (
          <li key={v.id}>
            <strong>{v.license_plate || v.plate_number}</strong> (ID: {v.id})
          </li>
        ))}
      </ul>
    </div>
  );
}
