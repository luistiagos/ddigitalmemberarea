import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CustomerArea } from './pages/CustomerArea';
import { StoreSelector } from './pages/StoreSelector';
import { CheckoutPage } from './pages/CheckoutPage';
import { PtBrAccess as PtBrAccessWorldCup } from './pages/access/worldcup/ptbr';
import { PtBrAccess as PtBrAccessPapper } from './pages/access/pappersoccerplayers/ptbr';
import { PtBrAccess as PtBrAccessTrofeu } from './pages/access/trofeu/ptbr';
import { PtBrAccess as PtBrAccessHLP } from './pages/access/HLP World Cup 2026 Group, Matches & Scores Printable/ptbr';
import { PtBrAccess as PtBrAccessMug } from './pages/access/mugcuparts/ptbr';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Raiz redireciona para login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/criar-senha" element={<SetPassword />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />

        {/* Global Public Checkout Page */}
        <Route path="/checkout" element={<CheckoutPage />} />

        {/* Seletor de loja — fallback quando nenhum store_id disponível */}
        <Route
          path="/selecionar-loja"
          element={
            <ProtectedRoute>
              <StoreSelector />
            </ProtectedRoute>
          }
        />

        {/* Área protegida — requer autenticação */}
        <Route
          path="/area-cliente"
          element={
            <ProtectedRoute>
              <CustomerArea />
            </ProtectedRoute>
          }
        />

        {/* Páginas de Acesso protegidas */}
        <Route
          path="/access/worldcup/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessWorldCup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/pappersoccerplayers/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessPapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/trofeu/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessTrofeu />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/mugcuparts/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessMug />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/HLP World Cup 2026 Group, Matches & Scores Printable/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessHLP />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/HLP World Cup 2026 Group, Matches %26 Scores Printable/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessHLP />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/HLP%20World%20Cup%202026%20Group,%20Matches%20%26%20Scores%20Printable/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessHLP />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access/HLP/ptbr"
          element={
            <ProtectedRoute>
              <PtBrAccessHLP />
            </ProtectedRoute>
          }
        />

        {/* Rota 404 — redireciona para login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
