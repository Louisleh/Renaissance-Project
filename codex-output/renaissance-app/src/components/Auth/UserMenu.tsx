import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './UserMenu.css';

function getUserLabel(email: string | undefined, displayName: unknown): string {
  if (typeof displayName === 'string' && displayName.trim().length > 0) {
    return displayName.trim();
  }

  if (email) {
    return email.split('@')[0];
  }

  return 'Member';
}

export function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const label = useMemo(() => {
    return getUserLabel(user?.email, user?.user_metadata?.full_name);
  }, [user?.email, user?.user_metadata?.full_name]);

  if (!user) {
    return null;
  }

  const avatarLetter = label.charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="user-avatar" aria-hidden="true">{avatarLetter}</span>
        <span className="user-label">{label}</span>
      </button>

      {open && (
        <div className="user-dropdown" role="menu">
          <button
            className="user-item"
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
            role="menuitem"
          >
            My Profile
          </button>
          <button
            className="user-item"
            onClick={() => {
              setOpen(false);
              navigate('/history');
            }}
            role="menuitem"
          >
            Assessment History
          </button>
          <button
            className="user-item is-danger"
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate('/');
            }}
            role="menuitem"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
