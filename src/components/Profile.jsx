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
          name: form.name, surname: form.surname,
          birth_date: form.birth_date, language: form.language,
          city: form.city, district: form.district,
        });
        updateUser({ ...user, ...(res.data.user ?? res.data) });
      }
      setPhotoFile(null);
      flash('success', "O'zgarishlar muvaffaqiyatli saqlandi!");
    } catch (err) {
      if (err.response?.status === 401) {
        flash('error', "Sessiya tugadi, yo'naltirilmoqda…");
        setTimeout(() => { logout(); navigate('/login'); }, 2000);
      } else {
        flash('error', err.response?.data?.detail || err.response?.data?.message || "O'zgarishlarni saqlashda xatolik.");
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

        <div className="pp-cover">
          <button className="pp-icon-btn pp-back" onClick={() => navigate(-1)} type="button" aria-label="Orqaga">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <button className="pp-icon-btn pp-logout" onClick={handleLogout} type="button" aria-label="Chiqish">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>

          <div className="pp-cover-body">
            <label className="pp-avatar-wrap">
              <input type="file" accept="image/*" onChange={onPhotoChange} hidden />
              <div className="pp-avatar">
                {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{initStr}</span>}
                <div className="pp-avatar-cam">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
              </div>
            </label>
            <h1 className="pp-name">{user?.full_name || fmtPhone(user?.phone_number) || 'Foydalanuvchi'}</h1>
            <p className="pp-phone">{fmtPhone(user?.phone_number)}</p>
            <div className="pp-pills">
              {user?.is_admin    && <span className="pp-pill pill-admin">Admin</span>}
              {user?.is_verified
                ? <span className="pp-pill pill-ok">✓ Tasdiqlangan</span>
                : <span className="pp-pill pill-warn">Tasdiqlanmagan</span>}
              {user?.is_active !== undefined && (
                user?.is_active
                  ? <span className="pp-pill pill-active">Faol</span>
                  : <span className="pp-pill pill-off">Nofaol</span>)}
              {user?.status && <span className="pp-pill pill-status">{user.status}</span>}
            </div>
          </div>
        </div>

        <form className="pp-sheet" onSubmit={saveProfile}>
          <div className="pp-handle" />

          {msg && (
            <div className={`pp-flash pp-flash--${msg.type}`} role="alert">
              {msg.type === 'success'
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              }
              {msg.text}
            </div>
          )}

          <p className="pp-section-label">Shaxsiy ma'lumotlar</p>

          <div className="pp-rows">
            <Row icon="user" label="Ism">
              <input name="name" value={form.name} onChange={onField}
                placeholder="Ismingizni kiriting" disabled={saving} />
            </Row>
            <Row icon="user" label="Familiya">
              <input name="surname" value={form.surname} onChange={onField}
                placeholder="Familiyangizni kiriting" disabled={saving} />
            </Row>
            <Row icon="cake" label="Tug'ilgan sana">
              <input type="date" name="birth_date" value={form.birth_date}
                onChange={onField} disabled={saving} />
            </Row>
            <Row icon="language" label="Til">
              <select name="language" value={form.language} onChange={onField} disabled={saving}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Row>
            <Row icon="building" label="Shahar">
              <input name="city" value={form.city} onChange={onField}
                placeholder="Shahringiz" disabled={saving} />
            </Row>
            <Row icon="map-pin" label="Tuman">
              <input name="district" value={form.district} onChange={onField}
                placeholder="Tumaningiz" disabled={saving} />
            </Row>
          </div>

          <button type="submit" className="pp-save" disabled={saving}>
            {saving
              ? <><span className="pp-spinner" /> Saqlanmoqda…</>
              : "O'zgarishlarni saqlash"}
          </button>
        </form>
      </div>
    </>
  );
}

function Row({ icon, label, children }) {
  return (
    <div className="pp-row">
      <div className="pp-row-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[icon]}
        </svg>
      </div>
      <span className="pp-row-label">{label}</span>
      <div className="pp-row-input">{children}</div>
    </div>
  );
}

const ICONS = {
  user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  cake:     <><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v2"/><path d="M12 8v2"/><path d="M17 8v2"/><path d="M7 4 12 2l5 2"/></>,
  language: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  building: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></>,
  'map-pin':<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
};

const CSS = `
*, *::before, *::after { box-sizing: border-box; }

.pp {
  --accent:      #4F6EF7;
  --accent-dk:   #3a57d0;
  --accent-lt:   rgba(79,110,247,0.10);
  --danger:      #ef4444;
  --danger-lt:   rgba(239,68,68,0.10);
  --header-bg:   #4F6EF7;

  width: 100%;
  min-height: 100vh;
  font-family: 'Geist', 'Inter', system-ui, sans-serif;
  background: #f4f6fb;
  display: flex;
  flex-direction: column;
}

.dark .pp {
  background: #131726;
  --header-bg:  #1A1F35;
  --accent-lt:  rgba(129,140,248,0.12);
  --accent-dk:  #a5b4fc;
}

/* ── Cover ── */
.pp-cover {
  background: var(--header-bg);
  padding: 18px 16px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.pp-icon-btn {
  position: absolute;
  top: 16px;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.13);
  border: none; color: rgba(255,255,255,0.85);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.15s;
}
.pp-icon-btn:hover { background: rgba(255,255,255,0.24); }
.dark .pp-icon-btn { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.50); }

.pp-back   { left: 16px; }
.pp-logout { right: 16px; }

.pp-cover-body {
  display: flex; flex-direction: column;
  align-items: center; gap: 5px;
  margin-top: 6px;
}

.pp-avatar-wrap { cursor: pointer; }

.pp-avatar {
  position: relative;
  width: 80px; height: 80px; border-radius: 50%;
  background: rgba(255,255,255,0.18);
  border: 2.5px solid rgba(255,255,255,0.45);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem; font-weight: 700; color: #fff;
  overflow: hidden; margin-bottom: 4px;
}
.dark .pp-avatar { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.16); }
.pp-avatar img { width: 100%; height: 100%; object-fit: cover; }

.pp-avatar-cam {
  position: absolute; bottom: 0; left: 0; right: 0; height: 26px;
  background: rgba(0,0,0,0.42);
  display: flex; align-items: center; justify-content: center;
  color: #fff; opacity: 0; transition: opacity 0.15s;
}
.pp-avatar:hover .pp-avatar-cam { opacity: 1; }

.pp-name {
  font-size: 17px; font-weight: 700; color: #fff;
  letter-spacing: -0.015em; text-align: center;
}
.dark .pp-name { color: #e8eaf6; }

.pp-phone { font-size: 12.5px; color: rgba(255,255,255,0.62); }
.dark .pp-phone { color: rgba(255,255,255,0.32); }

.pp-pills { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; margin-top: 2px; }
.pp-pill {
  font-size: 10px; font-weight: 600;
  padding: 2px 10px; border-radius: 99px;
}
.pill-admin  { background: rgba(255,255,255,0.18); color: #fff; }
.pill-ok     { background: rgba(74,222,128,0.22);  color: #bbf7d0; }
.pill-warn   { background: rgba(251,191,36,0.25);  color: #fde68a; }
.pill-active { background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.80); }
.pill-off    { background: rgba(0,0,0,0.18);        color: rgba(255,255,255,0.55); }
.pill-status { background: rgba(255,255,255,0.13);  color: rgba(255,255,255,0.75); }

/* ── Sheet ── */
.pp-sheet {
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  margin-top: -24px;
  flex: 1;
  padding: 0 0 2rem;
  display: flex; flex-direction: column;
  z-index: 2;
}
.dark .pp-sheet { background: #1e2438; }

.pp-handle {
  width: 36px; height: 3.5px; border-radius: 99px;
  margin: 12px auto 14px; flex-shrink: 0;
  background: #e0e0e0;
}
.dark .pp-handle { background: rgba(130,140,255,0.18); }

/* ── Flash ── */
.pp-flash {
  display: flex; align-items: center; gap: 8px;
  margin: 0 14px 12px; padding: 10px 14px;
  font-size: 12.5px; font-weight: 600;
  border-radius: 10px;
}
.pp-flash--success { background: var(--accent-lt); color: var(--accent-dk); }
.pp-flash--error   { background: var(--danger-lt); color: var(--danger); }

/* ── Section label ── */
.pp-section-label {
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.09em; text-transform: uppercase;
  padding: 8px 16px 5px; margin: 0;
  color: #ccc;
}
.dark .pp-section-label { color: #3a4060; }

/* ── Rows ── */
.pp-rows { display: flex; flex-direction: column; }

.pp-row {
  display: flex; align-items: center;
  padding: 0 16px; min-height: 54px;
  border-bottom: 0.5px solid #f0f0f0;
  gap: 10px;
}
.pp-row:last-child { border-bottom: none; }
.pp-row:focus-within { background: rgba(79,110,247,0.03); }
.dark .pp-row { border-bottom-color: rgba(130,140,255,0.08); }
.dark .pp-row:focus-within { background: rgba(79,110,247,0.05); }

.pp-row-icon {
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: rgba(79,110,247,0.08); color: #4F6EF7;
}
.dark .pp-row-icon { background: rgba(79,110,247,0.14); color: #818cf8; }

.pp-row-label {
  font-size: 13px; font-weight: 500;
  width: 120px; flex-shrink: 0;
  color: #222;
}
.dark .pp-row-label { color: #c7caff; }

.pp-row-input { flex: 1; }

.pp-row-input input,
.pp-row-input select {
  width: 100%;
  background: transparent;
  border: none; outline: none;
  font-size: 13px; font-weight: 400;
  color: #555; text-align: right;
  font-family: inherit;
  padding: 0;
  -webkit-appearance: none; appearance: none;
  cursor: text;
}
.pp-row-input input::placeholder { color: #ccc; }
.pp-row-input input:focus,
.pp-row-input select:focus { color: var(--accent); }
.pp-row-input input:disabled,
.pp-row-input select:disabled { opacity: 0.4; cursor: not-allowed; }

.dark .pp-row-input input,
.dark .pp-row-input select { color: #6070a0; }
.dark .pp-row-input input::placeholder { color: #2e3650; }
.dark .pp-row-input input:focus,
.dark .pp-row-input select:focus { color: #818cf8; }

/* ── Save button ── */
.pp-save {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin: 16px 14px 0;
  padding: 13px;
  width: calc(100% - 28px);
  background: var(--accent);
  color: #fff; border: none;
  border-radius: 12px;
  font-size: 14px; font-weight: 700;
  font-family: inherit; cursor: pointer;
  transition: opacity 0.15s, transform 0.10s;
}
.pp-save:hover:not(:disabled)  { opacity: 0.88; }
.pp-save:active:not(:disabled) { transform: scale(0.985); }
.pp-save:disabled              { opacity: 0.45; cursor: not-allowed; }

.dark .pp-save { background: #3a4fa8; }

/* ── Spinner ── */
.pp-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: pp-spin 0.65s linear infinite;
  flex-shrink: 0;
}
@keyframes pp-spin { to { transform: rotate(360deg); } }

@media (max-width: 480px) {
  .pp-cover  { padding: 16px 14px 44px; }
  .pp-row-label { width: 100px; }
}
`;