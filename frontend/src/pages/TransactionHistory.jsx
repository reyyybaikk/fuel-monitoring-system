import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(api.transactions());
      const json = await res.json();
      if (json.success) setTransactions(json.data);
    };
    fetchHistory();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Riwayat Transaksi BBM</h1>
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border">#</th>
            <th className="px-4 py-2 border">Vehicle</th>
            <th className="px-4 py-2 border">Liters</th>
            <th className="px-4 py-2 border">Cost</th>
            <th className="px-4 py-2 border">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, idx) => (
            <tr key={t.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-2 border text-center">{idx + 1}</td>
              <td className="px-4 py-2 border">{t.vehicle_id}</td>
              <td className="px-4 py-2 border text-right">{t.liters}</td>
              <td className="px-4 py-2 border text-right">{t.total_cost}</td>
              <td className="px-4 py-2 border">{new Date(t.transaction_date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

