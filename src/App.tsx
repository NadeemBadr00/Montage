import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login        from './pages/Login';
import Home         from './pages/Home';
import Startup      from './pages/Startup';
import Editor       from './pages/Editor';
import Analysis     from './pages/Analysis';
import StyleTransfer from './pages/StyleTransfer';
import SrtSplitter  from './pages/SrtSplitter';
import RemoveBg     from './pages/RemoveBg';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/"              element={<Home />} />
        <Route path="/startup"       element={<Startup />} />
        <Route path="/editor"        element={<Editor />} />
        <Route path="/analysis"      element={<Analysis />} />
        <Route path="/style-transfer" element={<StyleTransfer />} />
        <Route path="/srt"           element={<SrtSplitter />} />
        <Route path="/remove-bg"     element={<RemoveBg />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
