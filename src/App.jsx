import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CustomerArea } from './pages/CustomerArea';
import { StoreSelector } from './pages/StoreSelector';
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

        {/* Rota 404 — redireciona para login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
