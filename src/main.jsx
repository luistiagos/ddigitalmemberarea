import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', gap: 16 }}>
          <p style={{ fontSize: 18, fontWeight: 600 }}>Algo deu errado. Por favor, recarregue a página.</p>
          <button
            onClick={() => { sessionStorage.clear(); window.location.reload(); }}
            style={{ padding: '10px 28px', borderRadius: 10, background: '#f59e0b', color: '#1e293b', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)