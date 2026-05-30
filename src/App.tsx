import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login         from './pages/Login';
import Home          from './pages/Home';
import Startup       from './pages/Startup';
import EditorV2      from './pages/editor-v2/EditorV2';
import Analysis      from './pages/analysis/Analysis';
import StyleTransfer from './pages/analysis/StyleTransfer';
import SrtSplitter   from './pages/SrtSplitter';
import RemoveBg      from './pages/RemoveBg';
import Pricing       from './pages/Pricing';
import About         from './pages/About';
import Privacy       from './pages/Privacy';
import Terms         from './pages/Terms';
import Contact       from './pages/Contact';
import Cookies       from './pages/Cookies';
import PaymentSuccess from './pages/PaymentSuccess';
import { CookieBanner } from './components/ui/CookieBanner';
import { UltraPromoBanner } from './components/ui/UltraPromoBanner';
import Billing           from './pages/Billing';

export default function App() {
  useEffect(() => {
    document.title = "AI4Montage | The Future of Edge AI Video Editing";
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"          element={<Login />} />
        <Route path="/"               element={<Home />} />
        <Route path="/startup"        element={<Startup />} />
        <Route path="/pricing"        element={<Pricing />} />
        <Route path="/billing"        element={<Billing />} />
        <Route path="/about"          element={<About />} />
        <Route path="/privacy"        element={<Privacy />} />
        <Route path="/terms"          element={<Terms />} />
        <Route path="/contact"        element={<Contact />} />
        <Route path="/cookies"        element={<Cookies />} />
        <Route path="/editor/:id"     element={<EditorV2 />} />
        <Route path="/editor"         element={<Navigate to="/startup" replace />} />
        <Route path="/editor-v2"      element={<Navigate to="/startup" replace />} />
        <Route path="/analysis"       element={<Analysis />} />
        <Route path="/style-transfer" element={<StyleTransfer />} />
        <Route path="/srt"            element={<SrtSplitter />} />
        <Route path="/remove-bg"      element={<RemoveBg />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
      <CookieBanner />
      <UltraPromoBanner />
    </BrowserRouter>
  );
}
