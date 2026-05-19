import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import KundenverwaltungPage from '@/pages/KundenverwaltungPage';
import KatzenverwaltungPage from '@/pages/KatzenverwaltungPage';
import ZusatzleistungenPage from '@/pages/ZusatzleistungenPage';
import BuchungsverwaltungPage from '@/pages/BuchungsverwaltungPage';
import PublicFormKundenverwaltung from '@/pages/public/PublicForm_Kundenverwaltung';
import PublicFormKatzenverwaltung from '@/pages/public/PublicForm_Katzenverwaltung';
import PublicFormZusatzleistungen from '@/pages/public/PublicForm_Zusatzleistungen';
import PublicFormBuchungsverwaltung from '@/pages/public/PublicForm_Buchungsverwaltung';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a0c42e7de07a0de23255896" element={<PublicFormKundenverwaltung />} />
              <Route path="public/6a0c42effc83aceb7db3c82e" element={<PublicFormKatzenverwaltung />} />
              <Route path="public/6a0c42f058a2e85a9b23e897" element={<PublicFormZusatzleistungen />} />
              <Route path="public/6a0c42f0eede19ff84c9b740" element={<PublicFormBuchungsverwaltung />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
                <Route path="kundenverwaltung" element={<KundenverwaltungPage />} />
                <Route path="katzenverwaltung" element={<KatzenverwaltungPage />} />
                <Route path="zusatzleistungen" element={<ZusatzleistungenPage />} />
                <Route path="buchungsverwaltung" element={<BuchungsverwaltungPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
