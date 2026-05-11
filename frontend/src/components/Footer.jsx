import { Link } from 'react-router-dom';
import pkg from '../../package.json';

export default function Footer({ showAdminLink = false }) {
  const hasToken = !!localStorage.getItem('pulse_token');
  const versionStr = `Pulse v${pkg.version}`;

  const impressumUrl = import.meta.env.VITE_IMPRESSUM_URL;
  const privacyUrl = import.meta.env.VITE_PRIVACY_POLICY_URL;

  return (
    <footer className="mt-auto py-6 w-full flex items-center justify-center gap-3 text-xs">
      <a href="https://github.com/thefraggle/pulse" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/60 transition-colors">
        {versionStr}
      </a>
      <span className="text-white/10">·</span>
      <span className="text-white/30">© 2026 Daniel Notthoff</span>
      
      {impressumUrl && (
        <>
          <span className="text-white/10">·</span>
          <a href={impressumUrl} className="text-white/15 hover:text-white/30 transition-colors">
            Legal Notice
          </a>
        </>
      )}

      {privacyUrl && (
        <>
          <span className="text-white/10">·</span>
          <a href={privacyUrl} className="text-white/15 hover:text-white/30 transition-colors">
            Privacy Policy
          </a>
        </>
      )}

      {(showAdminLink && hasToken) && (
        <>
          <span className="text-white/10">·</span>
          <Link to="/dashboard" className="text-white/15 hover:text-white/30 transition-colors">
            Dashboard
          </Link>
        </>
      )}
    </footer>
  );
}
