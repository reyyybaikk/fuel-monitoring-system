import React, { useEffect, useState } from 'react';
import { api } from '../config/api';

export default function ReportsAnalytics() {
  const [analytics, setAnalytics] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // contoh mengambil data seluruh tahun 2023
      const res = await fetch(api.analytics('?start=2023-01-01&end=2023-12-31'));
      const json = await res.json();
      if (json.success) setAnalytics(json.data);
    };
    fetchAnalytics();
  }, []);

  return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Laporan & Analitik Penggunaan BBM</h2>
        <table className="min-w-full bg-white border border-slate-200 divide-y divide-slate-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border">Bulan</th>
              <th className="px-4 py-2 border">Total Liter</th>
              <th className="px-4 py-2 border">Total Biaya</th>
              <th className="px-4 py-2 border">Rata‑Rata Harga / Liter</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((row, idx) => (
              <tr key={row.month} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 border text-center">{row.month}</td>
                <td className="px-4 py-2 border text-right">{row.totalLiters.toLocaleString()}</td>
                <td className="px-4 py-2 border text-right">{row.totalCost.toLocaleString(undefined, {style: 'currency', currency: 'IDR'})}</td>
                <td className="px-4 py-2 border text-right">{row.avgPricePerLiter.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
}
