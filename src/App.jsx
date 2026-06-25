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

        {/* Rota 404 — redireciona para login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
