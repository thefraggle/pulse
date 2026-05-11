import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ParticipantView from './pages/ParticipantView';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LivePresentation from './pages/LivePresentation';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/live/:code" element={<LivePresentation />} />
      <Route path="/:code" element={<ParticipantView />} />
    </Routes>
  );
}

export default App;
