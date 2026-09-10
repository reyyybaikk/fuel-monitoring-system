import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(api.summary());
        const json = await res.json();
        if (json.success) {
          setSummary(json.data);
        } else {
          setError(json.message || 'Failed to fetch summary');
        }
      } catch (err) {
        console.error('Error fetching summary:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <div className="p-6"><p>Memuat data dashboard…</p></div>;
  if (error) return <div className="p-6"><p className="text-red-600">Error: {error}</p></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard Utama Monitoring BBM</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Total Transaksi</h2>
          <p>{summary.totalTransactions}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Total Liter</h2>
          <p>{summary.totalLiters?.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Total Biaya</h2>
          <p>{summary.totalCost?.toLocaleString(undefined, { style: 'currency', currency: 'IDR' })}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Anomali</h2>
          <p>{summary.anomalyCount}</p>
        </div>
      </div>
    </div>
  );
}

