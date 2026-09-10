import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TransactionHistory from './pages/TransactionHistory';
import ReportsAnalytics from './pages/ReportsAnalytics';
import ValidationAnomaly from './pages/ValidationAnomaly';
import FleetData from './pages/FleetData';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="history" element={<TransactionHistory />} />
          <Route path="reports" element={<ReportsAnalytics />} />
          <Route path="audit" element={<ValidationAnomaly />} />
          <Route path="fleet" element={<FleetData />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
