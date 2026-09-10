import React from 'react';

/**
 * Reusable statistic card used on the Dashboard.
 *
 * Props:
 *   - title: string – label of the stat (e.g., "Total Transaksi")
 *   - value: ReactNode – formatted value to display
 */
export default function StatCard({ title, value }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow hover:shadow-md transition-shadow">
      <h2 className="text-sm font-medium text-slate-600 mb-1">{title}</h2>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
