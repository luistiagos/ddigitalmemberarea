import { useAuth } from '@/hooks/useAuth';

function UserAvatar({ email }) {
  const initials = email
    ? email.substring(0, 2).toUpperCase()
    : '??';

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-gray-900 select-none">
      {initials}
    </div>
  );
}

/** Ícone gamepad FA solid com gradiente ciano→pink (igual ao site original) */
function LogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 512"
      width="36"
      height="29"
      style={{ transform: 'rotate(-10deg)', filter: 'drop-shadow(0 0 8px rgba(0,242,234,0.55))' }}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2ea" />
          <stop offset="100%" stopColor="#ff0055" />
        </linearGradient>
      </defs>
      <path
        fill="url(#logo-gradient)"
        d="M192 64C86 64 0 150 0 256S86 448 192 448l256 0c106 0 192-86 192-192s-86-192-192-192L192 64zM496 168a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM392 304a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM168 200c0-13.3 10.7-24 24-24s24 10.7 24 24l0 32 32 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-32 0 0 32c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-32-32 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l32 0 0-32z"
      />
    </svg>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <LogoIcon />
          <div className="hidden sm:flex flex-col leading-none" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px', color: '#fff', textTransform: 'uppercase' }}>
              Digital Store
            </span>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg, #fff 0%, #a0a0b0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Games
            </span>
          </div>
        </div>

        {/* Usuário + logout */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <UserAvatar email={user.email} />
              <span className="hidden sm:block text-sm text-gray-400 max-w-45 truncate">
                {user.email}
              </span>
            </>
          )}
          <button
            onClick={logout}
            className="ml-1 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}
