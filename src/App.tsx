import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import NewProject from './pages/project/NewProject';
import ProjectView from './pages/project/ProjectView';
import EstimateResult from './pages/project/EstimateResult';
import CompanySettings from './pages/settings/CompanySettings';
import PricingSettings from './pages/settings/PricingSettings';
import PhotosPage from './pages/placeholders/PhotosPage';
import BlueprintPage from './pages/placeholders/BlueprintPage';

export default function App() {
  return (
    <ErrorBoundary>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/project/new" element={<NewProject />} />
        <Route path="/project/:id" element={<ProjectView />} />
        <Route path="/project/:id/estimate" element={<EstimateResult />} />
        <Route path="/pricing" element={<PricingSettings />} />
        <Route path="/settings" element={<CompanySettings />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/blueprint" element={<BlueprintPage />} />
        {/* Catch-all */}
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
