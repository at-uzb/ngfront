import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'uz', label: "O'zbek"  },
  { value: 'ru', label: 'Русский' },
];

function initials(full_name, phone) {
  if (full_name) return full_name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return phone?.[0] ?? '?';
}

function fmtPhone(p) {
  if (!p) return '—';
  const d = p.replace(/\D/g, '');
  if (d.length === 9) return `+998 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,7)} ${d.slice(7)}`;
  return p;
}

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', surname: '', birth_date: '', city: '', district: '', language: 'en',
  });
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState(null);

  useEffect(() => {
    if (!user) return;
    const [name = '', ...rest] = (user.full_name || '').split(' ');
    setForm({
      name,
      surname:    rest.join(' '),
      birth_date: user.birth_date || '',
      city:       user.city       || '',
      district:   user.district   || '',
      language:   user.language   || 'en',
    });
  }, [user]);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const onField = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onPhotoChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        fd.append('name', form.name);
        fd.append('surname', form.surname);
        fd.append('birth_date', form.birth_date);
        fd.append('language', form.language);
        fd.append('city', form.city);
        fd.append('district', form.district);
        const res = await api.patch('/users/update/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updateUser({ ...user, ...(res.data.user ?? res.data) });
      } else {
        const res = await api.patch('/users/update/', {
          name:       form.name,
          surname:    form.surname,
          birth_date: form.birth_date,
          language:   form.language,
          city:       form.city,
          district:   form.district,
        });
        updateUser({ ...user, ...(res.data.user ?? res.data) });
      }
      setPhotoFile(null);
      flash('success', "Muvaffaqiyatli saqlandi!");
    } catch (err) {
      if (err.response?.status === 401) {
        flash('error', 'Session expired, redirecting…');
        setTimeout(() => { logout(); navigate('/login'); }, 2000);
      } else {
        flash('error', err.response?.data?.detail || err.response?.data?.message || 'Could not save changes.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  };

  const avatarSrc = photoPreview || user?.photo || null;
  const initStr   = initials(user?.full_name, user?.phone_number);

  return (
    <>
      <style>{CSS}</style>
      <div className="pp">

        {/* ── Cover backdrop ── */}
        <div className="pp-cover">
          <button className="pp-back" onClick={() => navigate(-1)} type="button" aria-label="Go back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <button className="pp-signout-top" onClick={handleLogout} type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>

          {/* Centered avatar */}
          <div className="pp-cover-center">
            <label className="pp-avatar-wrap">
              <input type="file" accept="image/*" onChange={onPhotoChange} hidden />
              <div className="pp-avatar">
                {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{initStr}</span>}
                <div className="pp-avatar-overlay">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
            </label>
            <h1 className="pp-cover-name">{user?.full_name || fmtPhone(user?.phone_number) || 'User'}</h1>
            <p className="pp-cover-phone">{fmtPhone(user?.phone_number)}</p>
            <div className="pp-pills">
              {user?.is_admin    && <span className="pp-pill pill-admin">Admin</span>}
              {user?.is_verified
                ? <span className="pp-pill pill-ok">✓ Verified</span>
                : <span className="pp-pill pill-warn">Unverified</span>}
              {user?.is_active !== undefined && (
                user?.is_active
                  ? <span className="pp-pill pill-active">Active</span>
                  : <span className="pp-pill pill-off">Inactive</span>)}
              {user?.status && <span className="pp-pill pill-status">{user.status}</span>}
            </div>
          </div>
        </div>

        {/* ── Sheet ── */}
        <form className="pp-sheet" onSubmit={saveProfile}>

          {/* drag handle */}
          <div className="pp-handle" />

          {/* Flash */}
          {msg && (
            <div className={`pp-flash pp-flash--${msg.type}`} role="alert">
              {msg.type === 'success'
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
              {msg.text}
            </div>
          )}

          {/* Rows */}
          <div className="pp-rows">

            <Row icon="👤" label="First name">
              <input name="name" value={form.name} onChange={onField}
                placeholder="Enter first name" disabled={saving} />
            </Row>

            <Row icon="👤" label="Last name">
              <input name="surname" value={form.surname} onChange={onField}
                placeholder="Enter last name" disabled={saving} />
            </Row>

            <Row icon="🎂" label="Date of birth">
              <input type="date" name="birth_date" value={form.birth_date}
                onChange={onField} disabled={saving} />
            </Row>

            <Row icon="🌐" label="Language">
              <select name="language" value={form.language} onChange={onField} disabled={saving}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Row>

            <Row icon="🏙️" label="City">
              <input name="city" value={form.city} onChange={onField}
                placeholder="Your city" disabled={saving} />
            </Row>

            <Row icon="📍" label="District">
              <input name="district" value={form.district} onChange={onField}
                placeholder="Your district" disabled={saving} />
            </Row>

          </div>

          <button type="submit" className="pp-save" disabled={saving}>
            {saving ? <><span className="pp-spinner" /> Saqlanmoqda…</> : "O'zgarishlarni saqlash!"}
          </button>

        </form>
      </div>
    </>
  );
}

function Row({ icon, label, children }) {
  return (
    <div className="pp-row">
      <div className="pp-row-left">
        <span className="pp-row-icon">{icon}</span>
        <span className="pp-row-label">{label}</span>
      </div>
      <div className="pp-row-input">{children}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; }

.pp {
  --accent:       #3d9e6b;
  --accent-dk:    #2e7d52;
  --accent-lt:    #d0f8d0;
  --bg:           linear-gradient(160deg, #5effa5 0%, #3d9e6b 100%);
  --danger:       #ff6b6b;
  --danger-lt:    rgba(255, 107, 107, 0.12);

  width: 100%;
  min-height: 100vh;
  font-family: 'Nunito', sans-serif;
  color: #1a1a1a;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ── Cover ── */
.pp-cover {
  position: relative;
  background: transparent;
  padding: 3.5rem 1.5rem 7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pp-back {
  position: absolute;
  top: 1.1rem;
  left: 1.1rem;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.pp-back:hover { background: rgba(255,255,255,0.28); }

.pp-signout-top {
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.pp-signout-top:hover { background: rgba(255,255,255,0.28); }

.pp-cover-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

/* Avatar */
.pp-avatar-wrap { cursor: pointer; }
.pp-avatar {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255,255,255,0.25);
  border: 3.5px solid rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  overflow: hidden;
  margin-bottom: 0.5rem;
}
.pp-avatar img { width: 100%; height: 100%; object-fit: cover; }
.pp-avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.18s;
}
.pp-avatar:hover .pp-avatar-overlay,
.pp-avatar-wrap:focus-within .pp-avatar-overlay { opacity: 1; }

.pp-cover-name {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  text-align: center;
}
.pp-cover-phone {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.75);
  margin: 0;
}

.pp-pills {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.2rem;
}
.pp-pill {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.2rem 0.65rem;
  border-radius: 99px;
  letter-spacing: 0.02em;
}
.pill-admin  { background: rgba(255,255,255,0.2); color: #fff; }
.pill-ok     { background: rgba(255,255,255,0.2); color: #fff; }
.pill-warn   { background: rgba(255,220,80,0.3);  color: #fff3b0; }
.pill-active { background: rgba(255,255,255,0.2); color: #fff; }
.pill-off    { background: rgba(0,0,0,0.15);       color: rgba(255,255,255,0.6); }
.pill-status { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }

/* ── Sheet ── */
.pp-sheet {
  background: #f5f5f5;
  border-radius: 28px 28px 0 0;
  margin-top: -3rem;
  flex: 1;
  padding: 0 0 2rem;
  display: flex;
  flex-direction: column;
}
.pp-handle {
  width: 40px;
  height: 4px;
  background: #ddd;
  border-radius: 99px;
  margin: 12px auto 20px;
  flex-shrink: 0;
}

/* Flash */
.pp-flash {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 1.25rem 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.84rem;
  font-weight: 600;
  border-radius: 14px;
}
.pp-flash--success { background: var(--accent-lt); color: var(--accent-dk); }
.pp-flash--error   { background: var(--danger-lt); color: var(--danger); }

/* Rows */
.pp-rows {
  display: flex;
  flex-direction: column;
}

.pp-row {
  display: flex;
  align-items: center;
  padding: 0 1.25rem;
  min-height: 62px;
  border-bottom: 1px solid #ebebeb;
  gap: 0.75rem;
}
.pp-row:last-child { border-bottom: none; }

.pp-row-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 130px;
  flex-shrink: 0;
}
.pp-row-icon {
  font-size: 1.1rem;
  line-height: 1;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}
.pp-row-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.pp-row-input { flex: 1; }

.pp-sheet input,
.pp-sheet select {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1.5px solid #d8d8d8;
  border-radius: 0;
  outline: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: #222;
  font-family: inherit;
  text-align: right;
  padding: 0.3rem 0;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.15s;
}
.pp-sheet input::placeholder { color: #bbb; }
.pp-sheet input:focus,
.pp-sheet select:focus {
  border-bottom-color: #3d9e6b;
  color: #222;
}
.pp-sheet input:disabled,
.pp-sheet select:disabled { opacity: 0.45; cursor: not-allowed; }

/* Save — matches cover gradient exactly */
.pp-save {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1.25rem 1.25rem 0;
  padding: 1rem;
  background: linear-gradient(160deg, #5effa5 0%, #3d9e6b 100%);
  color: #fff;
  border: none;
  border-radius: 18px;
  font-size: 0.95rem;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  text-shadow: 0 1px 2px rgba(0,0,0,0.15);
  transition: opacity 0.15s, transform 0.1s;
}
.pp-save:hover:not(:disabled) { opacity: 0.88; }
.pp-save:active:not(:disabled) { transform: scale(0.985); }
.pp-save:disabled { opacity: 0.5; cursor: not-allowed; }

.pp-spinner {
  width: 15px;
  height: 15px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: pp-spin 0.65s linear infinite;
  flex-shrink: 0;
}
@keyframes pp-spin { to { transform: rotate(360deg); } }

/* ── Mobile ── */
@media (max-width: 480px) {
  .pp-cover { padding: 3rem 1rem 6.5rem; }
  .pp-row-left { width: 110px; }
  .pp-row-label { font-size: 0.83rem; }
  .pp-sheet input, .pp-sheet select { font-size: 0.85rem; }
}
`;