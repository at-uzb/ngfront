import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import '../assets/Profile.css';

const TABS = [
  { id: 'profile',       label: 'Personal Info' },
  { id: 'appearance',    label: 'Appearance'    },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security',      label: 'Security'      },
];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { isAdmin, isVerified } = useRole();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');

  /* ── Profile form ── */
  const [form, setForm] = useState({
    full_name:  user?.full_name  || '',
    birth_date: user?.birth_date || '',
    city:       user?.city       || '',
    district:   user?.district   || '',
    language:   user?.language   || 'en',
  });

  /* ── Appearance settings ── */
  const [appearance, setAppearance] = useState({
    dark_mode:      false,
    compact_layout: false,
    font_size:      'default',
  });

  /* ── Notification settings ── */
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    sms_notifications:   false,
    login_alerts:        true,
    weekly_digest:       false,
  });

  /* ── Security form ── */
  const [security, setSecurity] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
    two_factor:       false,
  });

  /* ── UI state ── */
  const [saving,     setSaving]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [msg,        setMsg]        = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setForm({
        full_name:  user.full_name  || '',
        birth_date: user.birth_date || '',
        city:       user.city       || '',
        district:   user.district   || '',
        language:   user.language   || 'en',
      });
    }
  }, [user]);

  /* apply dark mode class to <html> */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', appearance.dark_mode);
  }, [appearance.dark_mode]);

  const clearMsg = () => setMsg({ type: '', text: '' });

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(clearMsg, 3500);
  };

  /* ── Handlers ── */
  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    clearMsg();
  };

  const handleAppearanceChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setAppearance(prev => ({ ...prev, [e.target.name]: val }));
    clearMsg();
  };

  const handleNotifChange = (e) => {
    setNotifications(prev => ({ ...prev, [e.target.name]: e.target.checked }));
    clearMsg();
  };

  const handleSecurityChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSecurity(prev => ({ ...prev, [e.target.name]: val }));
    clearMsg();
  };

  const handleTabChange = (id) => {
    setTab(id);
    clearMsg();
  };

  /* ── Save handlers ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/update/', form);
      updateUser(res.data.user ?? res.data);
      showMsg('success', '✓ Profile saved successfully!');
    } catch (err) {
      if (err.response?.status === 401) {
        showMsg('error', 'Session expired. Redirecting to login…');
        setTimeout(() => { logout(); navigate('/login'); }, 2000);
      } else {
        showMsg('error', err.response?.data?.message || err.response?.data?.detail || 'Failed to save profile.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/settings/appearance/', appearance);
      showMsg('success', '✓ Appearance settings saved!');
    } catch {
      showMsg('error', 'Failed to save appearance settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/settings/notifications/', notifications);
      showMsg('success', '✓ Notification preferences saved!');
    } catch {
      showMsg('error', 'Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    if (security.new_password !== security.confirm_password) {
      showMsg('error', 'New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/users/settings/security/', {
        current_password: security.current_password,
        new_password:     security.new_password,
        two_factor:       security.two_factor,
      });
      setSecurity(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
      showMsg('success', '✓ Security settings updated!');
    } catch (err) {
      showMsg('error', err.response?.data?.detail || 'Failed to update security settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Sign out of all other devices?')) return;
    try {
      await api.post('/users/sessions/revoke-all/');
      showMsg('success', '✓ All other sessions have been revoked.');
    } catch {
      showMsg('error', 'Failed to revoke sessions.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('This will permanently delete your account. Are you sure?')) return;
    try {
      await api.delete('/users/delete/');
      await logout();
      navigate('/login', { replace: true });
    } catch {
      showMsg('error', 'Failed to delete account. Please contact support.');
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  /* ── Shared feedback banner ── */
  const Feedback = () => {
    if (!msg.text) return null;
    return <div className={`form-${msg.type}`}>{msg.text}</div>;
  };

  /* ── Toggle component ── */
  const Toggle = ({ name, checked, onChange }) => (
    <label className="toggle-switch">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={saving}
      />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  );

  /* ── Setting row component ── */
  const SettingRow = ({ label, description, children }) => (
    <div className="setting-row">
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {description && <span className="setting-desc">{description}</span>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );

  /* ─────────────────────────────────────────── */

  return (
    <div className="profile-page">

      {/* ── Avatar / header ── */}
      <div className="profile-header">
        <div className="profile-avatar">
          {user?.photo
            ? <img src={user.photo} alt="avatar" />
            : <span>{(user?.full_name || user?.phone_number)?.[0]?.toUpperCase()}</span>
          }
        </div>
        <div className="profile-meta">
          <h2>{user?.full_name || user?.phone_number}</h2>
          <p className="profile-phone">{user?.phone_number}</p>
          <div className="profile-badges">
            {isAdmin   && <span className="badge badge-admin">Admin</span>}
            {isVerified
              ? <span className="badge badge-verified">✓ Verified</span>
              : <span className="badge badge-unverified">Unverified</span>
            }
            <span className="badge badge-status">{user?.status}</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="profile-tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`profile-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ PERSONAL INFO ══════════════ */}
      {tab === 'profile' && (
        <form className="profile-form" onSubmit={handleSaveProfile}>
          <h3>Personal information</h3>
          <Feedback />
          <div className="form-grid">
            <label className="form-label">
              Full name
              <input name="full_name" value={form.full_name} onChange={handleFormChange} disabled={saving} />
            </label>
            <label className="form-label">
              Birth date
              <input type="date" name="birth_date" value={form.birth_date || ''} onChange={handleFormChange} disabled={saving} />
            </label>
            <label className="form-label">
              City
              <input name="city" value={form.city} onChange={handleFormChange} disabled={saving} />
            </label>
            <label className="form-label">
              District
              <input name="district" value={form.district} onChange={handleFormChange} disabled={saving} />
            </label>
            <label className="form-label">
              Language
              <select name="language" value={form.language} onChange={handleFormChange} disabled={saving}>
                <option value="en">English</option>
                <option value="uz">O'zbek</option>
                <option value="ru">Русский</option>
              </select>
            </label>
          </div>
          <div className="profile-actions">
            <button type="submit" className="btn-primary" disabled={saving || loggingOut}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn-danger" onClick={handleLogout} disabled={saving || loggingOut}>
              {loggingOut ? 'Logging out…' : 'Sign out'}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════ APPEARANCE ══════════════ */}
      {tab === 'appearance' && (
        <form className="profile-form" onSubmit={handleSaveAppearance}>
          <h3>Appearance</h3>
          <Feedback />

          <p className="settings-section-label">Theme</p>
          <SettingRow label="Dark mode" description="Switch between light and dark interface">
            <Toggle name="dark_mode" checked={appearance.dark_mode} onChange={handleAppearanceChange} />
          </SettingRow>
          <SettingRow label="Compact layout" description="Reduce spacing for a denser view">
            <Toggle name="compact_layout" checked={appearance.compact_layout} onChange={handleAppearanceChange} />
          </SettingRow>

          <p className="settings-section-label">Text size</p>
          <SettingRow label="Font size" description="Adjust the base text size of the interface">
            <label className="form-label" style={{ marginBottom: 0 }}>
              <select
                name="font_size"
                value={appearance.font_size}
                onChange={handleAppearanceChange}
                disabled={saving}
                style={{ minWidth: 140 }}
              >
                <option value="small">Small (14px)</option>
                <option value="default">Default (16px)</option>
                <option value="large">Large (18px)</option>
              </select>
            </label>
          </SettingRow>

          <div className="profile-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════ NOTIFICATIONS ══════════════ */}
      {tab === 'notifications' && (
        <form className="profile-form" onSubmit={handleSaveNotifications}>
          <h3>Notifications</h3>
          <Feedback />

          <p className="settings-section-label">Channels</p>
          <SettingRow label="Email notifications" description="Receive updates and alerts via email">
            <Toggle name="email_notifications" checked={notifications.email_notifications} onChange={handleNotifChange} />
          </SettingRow>
          <SettingRow label="SMS notifications" description="Get important alerts to your phone number">
            <Toggle name="sms_notifications" checked={notifications.sms_notifications} onChange={handleNotifChange} />
          </SettingRow>

          <p className="settings-section-label">Activity</p>
          <SettingRow label="Login alerts" description="Notify when a new device signs in to your account">
            <Toggle name="login_alerts" checked={notifications.login_alerts} onChange={handleNotifChange} />
          </SettingRow>
          <SettingRow label="Weekly digest" description="Receive a weekly summary of your activity">
            <Toggle name="weekly_digest" checked={notifications.weekly_digest} onChange={handleNotifChange} />
          </SettingRow>

          <div className="profile-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {/* ══════════════ SECURITY ══════════════ */}
      {tab === 'security' && (
        <form className="profile-form" onSubmit={handleSaveSecurity}>
          <h3>Security</h3>
          <Feedback />

          <p className="settings-section-label">Change password</p>
          <div className="form-grid">
            <label className="form-label" style={{ gridColumn: '1 / -1' }}>
              Current password
              <input
                type="password"
                name="current_password"
                value={security.current_password}
                onChange={handleSecurityChange}
                placeholder="••••••••"
                disabled={saving}
                autoComplete="current-password"
              />
            </label>
            <label className="form-label">
              New password
              <input
                type="password"
                name="new_password"
                value={security.new_password}
                onChange={handleSecurityChange}
                placeholder="••••••••"
                disabled={saving}
                autoComplete="new-password"
              />
            </label>
            <label className="form-label">
              Confirm password
              <input
                type="password"
                name="confirm_password"
                value={security.confirm_password}
                onChange={handleSecurityChange}
                placeholder="••••••••"
                disabled={saving}
                autoComplete="new-password"
              />
            </label>
          </div>

          <p className="settings-section-label">Two-factor authentication</p>
          <SettingRow label="Enable 2FA" description="Add an extra layer of protection to your account">
            <Toggle name="two_factor" checked={security.two_factor} onChange={handleSecurityChange} />
          </SettingRow>

          <p className="settings-section-label">Sessions</p>
          <SettingRow label="Active sessions" description="Sign out of all other devices">
            <button
              type="button"
              className="btn-danger btn-small"
              onClick={handleRevokeAllSessions}
              disabled={saving}
            >
              Revoke all
            </button>
          </SettingRow>

          <div className="profile-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </div>

          <p className="settings-section-label settings-danger-label">Danger zone</p>
          <div className="danger-zone">
            <div className="danger-zone-info">
              <span className="danger-zone-title">Delete account</span>
              <span className="danger-zone-desc">
                Permanently remove your account and all associated data. This cannot be undone.
              </span>
            </div>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDeleteAccount}
              disabled={saving}
            >
              Delete account
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
