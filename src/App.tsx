import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import NewProject from './pages/project/NewProject';
import ProjectView from './pages/project/ProjectView';
import EstimateResult from './pages/project/EstimateResult';
import ProposalPage from './pages/project/ProposalPage';
import BOQReviewPage from './pages/project/BOQReviewPage';
import EstimationBriefPage from './pages/estimate/EstimationBriefPage';
import CompanySettings from './pages/settings/CompanySettings';
import PricingSettings from './pages/settings/PricingSettings';
import PhotosPage from './pages/photos/PhotosPage';
import VoiceQuotePage from './pages/voice/VoiceQuotePage';
import BlueprintPage from './pages/blueprint/BlueprintPage';

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
        <Route path="/project/:id/proposal" element={<ProposalPage />} />
        <Route path="/project/:id/boq" element={<BOQReviewPage />} />
        <Route path="/estimate/brief" element={<EstimationBriefPage />} />
        <Route path="/pricing" element={<PricingSettings />} />
        <Route path="/settings" element={<CompanySettings />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/voice" element={<VoiceQuotePage />} />
        <Route path="/blueprint" element={<BlueprintPage />} />
        {/* Catch-all */}
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
