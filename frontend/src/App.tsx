import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import NewInvestigation from "./pages/NewInvestigation";
import MemoryIntelligence from "./pages/MemoryIntelligence";
import Patterns from "./pages/Patterns";
import AgentCollaboration from "./pages/AgentCollaboration";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="investigate" element={<NewInvestigation />} />
        <Route path="memory" element={<MemoryIntelligence />} />
        <Route path="patterns" element={<Patterns />} />
        <Route path="agents" element={<AgentCollaboration />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
