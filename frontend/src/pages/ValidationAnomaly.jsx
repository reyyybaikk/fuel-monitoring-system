import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function ValidationAnomaly() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(api.transactions());
      const json = await res.json();
      if (json.success) setTransactions(json.data.filter(t => t.ml_is_anomaly));
    };
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Validasi & Anomali Transaksi BBM</h1>
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border">No.</th>
            <th className="px-4 py-2 border">Vehicle</th>
            <th className="px-4 py-2 border">Anomaly Score</th>
            <th className="px-4 py-2 border">Reasons</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, idx) => (
            <tr key={t.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-2 border text-center">{idx + 1}</td>
              <td className="px-4 py-2 border">{t.vehicle_id}</td>
              <td className="px-4 py-2 border text-right">{t.ml_anomaly_score?.toFixed(2) || '-'} </td>
              <td className="px-4 py-2 border">{t.ml_anomaly_reasons?.join(', ') || '-'} </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

