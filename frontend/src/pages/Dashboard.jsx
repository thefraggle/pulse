import { useState, useEffect, useCallback, useId } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { exportRoomToCSV } from '../utils/exportUtils';
import { startDashboardTour } from '../utils/tourUtils';

export default function Dashboard() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [type, setType] = useState('WORDCLOUD');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [wordLimit, setWordLimit] = useState(4);
  const [searchInput, setSearchInput] = useState(() => searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') || '');
  const [newUsername, setNewUsername] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });
  const [roomFormError, setRoomFormError] = useState('');
  const [userFormError, setUserFormError] = useState('');
  const [highlightForm, setHighlightForm] = useState(false);

  // Modal & Loading states
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem('pulse_token');
  const role = localStorage.getItem('pulse_role');
  const username = localStorage.getItem('pulse_username');

  const typeSelectId = useId();
  const questionInputId = useId();
  const wordLimitId = useId();
  const searchInputId = useId();
  const newUsernameId = useId();
  const oldPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  const rawTab = searchParams.get('tab');
  const activeTab =
    rawTab === 'users' && role === 'SUPERADMIN'
      ? 'users'
      : rawTab === 'settings' && role !== 'SUPERADMIN'
        ? 'settings'
        : 'rooms';

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  // Debounce session search query and persist in URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) {
        next.set('q', searchInput.trim());
      } else {
        next.delete('q');
      }
      setSearchParams(next, { replace: true });
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('pulse_token');
        localStorage.removeItem('pulse_role');
        localStorage.removeItem('pulse_username');
        navigate('/login');
        return;
      }
      const data = await res.json();
      setRooms(data);
    } catch (e) {
      console.error(e);
    }
  }, [token, navigate]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    let isMounted = true;
    const init = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('pulse_token');
          localStorage.removeItem('pulse_role');
          localStorage.removeItem('pulse_username');
          navigate('/login');
          return;
        }
        const data = await res.json();
        if (isMounted) setRooms(data);
      } catch (e) {
        console.error(e);
      }

      if (role === 'SUPERADMIN') {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (isMounted) setUsers(data);
        } catch (e) {
          console.error(e);
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [navigate, token, role]);

  useEffect(() => {
    if (!token) return;
    let timer;
    if (activeTab === 'rooms') {
      timer = setTimeout(() => startDashboardTour(), 500);
    }
    const handleStartTour = () => {
      if (activeTab === 'rooms') startDashboardTour(true);
    };
    window.addEventListener('start-tour', handleStartTour);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('start-tour', handleStartTour);
    };
  }, [activeTab, token]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setRoomFormError('');
    let finalOptions = options.map(o => o.trim()).filter(o => o !== '');
    
    if ((type === 'POLL' || type === 'RANKING') && finalOptions.length < 2) {
      setRoomFormError(t('dashboard.minOptionsError'));
      return;
    }
    
    if (type === 'RATING' && finalOptions.length === 0) {
      finalOptions = ['Overall Rating'];
    }

    setCreatingRoom(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          question: question.trim() || null,
          wordLimit: type === 'WORDCLOUD' ? wordLimit : 4,
          options: (type === 'POLL' || type === 'RANKING' || type === 'RATING') ? finalOptions : []
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setRoomFormError(errData.error || t('home.connectionError'));
        setCreatingRoom(false);
        return;
      }
      const data = await res.json();
      navigate(`/live/${data.code}`);
    } catch (e) {
      console.error(e);
      setRoomFormError(t('home.connectionError'));
      setCreatingRoom(false);
    }
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms/${roomToDelete.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchRooms();
      setRoomToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadTemplate = (room) => {
    setType(room.type);
    setQuestion(room.question || '');
    setWordLimit(room.wordLimit || 4);
    setRoomFormError('');
    if (room.options && room.options.length > 0) {
      setOptions(room.options.map(o => o.text));
    } else {
      setOptions(['', '']);
    }
    
    setHighlightForm(true);
    setTimeout(() => setHighlightForm(false), 2000);

    const formElement = document.getElementById('tour-create-session');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserFormError('');
    setCreatingUser(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data);
        setNewUsername('');
        fetchUsers();
      } else {
        setUserFormError(data.error || t('home.connectionError'));
      }
    } catch (e) {
      console.error(e);
      setUserFormError(t('home.connectionError'));
    } finally {
      setCreatingUser(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/${userToDelete.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchUsers();
      await fetchRooms();
      setUserToDelete(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwdMessage({ text: t('dashboard.passwordTooShort'), type: 'error' });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPwdMessage({ text: t('dashboard.passwordsMismatch'), type: 'error' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMessage({ text: t('dashboard.passwordChanged'), type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        setPwdMessage({ text: data.error || t('dashboard.passwordChangeError'), type: 'error' });
      }
    } catch {
      setPwdMessage({ text: t('home.connectionError'), type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    if (roomFormError) setRoomFormError('');
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const filteredRooms = rooms.filter((r) => {
    if (!normalizedQuery) return true;
    return (
      (r.question || '').toLowerCase().includes(normalizedQuery) ||
      (r.code || '').toLowerCase().includes(normalizedQuery) ||
      (r.type || '').toLowerCase().includes(normalizedQuery) ||
      (r.user?.username || '').toLowerCase().includes(normalizedQuery)
    );
  });

  return (
    <div className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto flex flex-col">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-white/75 text-sm mt-1">
            {t('dashboard.welcome')}, <span className="text-white font-medium">{username}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="min-h-11 px-3 inline-flex items-center text-white/75 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {t('notFound.backHome')}
          </Link>
          <LanguageSwitcher />
          <button 
            type="button"
            onClick={() => {
              localStorage.removeItem('pulse_token');
              localStorage.removeItem('pulse_role');
              localStorage.removeItem('pulse_username');
              navigate('/login');
            }}
            className="min-h-11 px-3 text-white/75 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {t('common.logout')}
          </button>
        </div>
      </header>

      <nav aria-label="Dashboard" className="flex gap-4 mb-8 border-b border-white/10 pb-2">
        <button 
          type="button"
          className={`min-h-11 font-bold pb-2 px-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded ${activeTab === 'rooms' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/70 hover:text-white'}`}
          onClick={() => setActiveTab('rooms')}
        >
          {t('dashboard.activeSessions')}
        </button>
        {role === 'SUPERADMIN' && (
          <button 
            type="button"
            className={`min-h-11 font-bold pb-2 px-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded ${activeTab === 'users' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/70 hover:text-white'}`}
            onClick={() => setActiveTab('users')}
          >
            {t('dashboard.usersTab')}
          </button>
        )}
        {role !== 'SUPERADMIN' && (
          <button 
            type="button"
            className={`min-h-11 font-bold pb-2 px-1 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded ${activeTab === 'settings' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/70 hover:text-white'}`}
            onClick={() => setActiveTab('settings')}
          >
            {t('dashboard.settingsTab')}
          </button>
        )}
      </nav>

      {activeTab === 'rooms' && (
        <div className="grid md:grid-cols-[4fr_7fr] gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className={`glass-card p-6 transition-all duration-500 ${highlightForm ? 'ring-2 ring-indigo-500 border-transparent shadow-[0_0_20px_rgba(99,102,241,0.5)] scale-[1.01]' : ''}`} 
            id="tour-create-session"
          >
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">{t('dashboard.newSession')}</h2>
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div>
                <label htmlFor={typeSelectId} className="block text-sm text-white/80 mb-2">{t('dashboard.sessionType')}</label>
                <select 
                  id={typeSelectId}
                  value={type} 
                  onChange={(e) => {
                    setType(e.target.value);
                    setRoomFormError('');
                  }}
                  className="glass-input w-full bg-[#131625]"
                >
                  <option value="WORDCLOUD" className="bg-[#0d0f1a] text-white">{t('dashboard.types.WORDCLOUD')}</option>
                  <option value="POLL" className="bg-[#0d0f1a] text-white">{t('dashboard.types.POLL')}</option>
                  <option value="QNA" className="bg-[#0d0f1a] text-white">{t('dashboard.types.QNA')}</option>
                  <option value="OPEN_ENDED" className="bg-[#0d0f1a] text-white">{t('dashboard.types.OPEN_ENDED')}</option>
                  <option value="RANKING" className="bg-[#0d0f1a] text-white">{t('dashboard.types.RANKING')}</option>
                  <option value="RATING" className="bg-[#0d0f1a] text-white">{t('dashboard.types.RATING')}</option>
                </select>
                <div className="text-xs text-white/75 mt-2 bg-white/5 p-2.5 rounded-lg border border-white/10">
                  {t(`dashboard.types.${type}_DESC`)}
                </div>
              </div>

              <div>
                <label htmlFor={questionInputId} className="block text-sm text-white/80 mb-2">{t('dashboard.question')}</label>
                <input
                  id={questionInputId}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t('dashboard.questionPlaceholder')}
                  className="glass-input w-full text-sm"
                />
              </div>

              {type === 'WORDCLOUD' && (
                <div>
                  <label htmlFor={wordLimitId} className="block text-sm text-white/80 mb-2">{t('participant.wordLimit', { count: wordLimit })}</label>
                  <input
                    id={wordLimitId}
                    type="number"
                    min="1"
                    max="20"
                    value={wordLimit}
                    onChange={(e) => setWordLimit(parseInt(e.target.value, 10) || 1)}
                    className="glass-input w-full text-sm"
                  />
                </div>
              )}

              {(type === 'POLL' || type === 'RANKING' || type === 'RATING') && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="block text-sm text-white/80">{t('dashboard.pollOptions')}</span>
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        aria-label={`Option ${i + 1}`}
                        className="glass-input w-full text-sm py-2"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(i)}
                          aria-label={t('common.delete')}
                          className="min-w-11 min-h-11 flex items-center justify-center text-white/60 hover:text-red-300 bg-white/5 hover:bg-red-500/15 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="min-h-11 text-sm text-indigo-300 text-left mt-1 hover:text-indigo-200 cursor-pointer px-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    + {t('dashboard.addOption')}
                  </button>
                </div>
              )}

              {roomFormError && (
                <div role="alert" className="text-red-300 text-sm bg-red-500/15 border border-red-500/30 p-2.5 rounded-lg">
                  {roomFormError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={creatingRoom} 
                className="glow-button min-h-11 py-3 mt-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                {creatingRoom && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {creatingRoom ? t('common.loading') : t('dashboard.create')}
              </button>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6" id="tour-active-sessions">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold">{t('dashboard.activeSessions')}</h2>
              {rooms.length > 0 && (
                <div className="w-full sm:w-56">
                  <label htmlFor={searchInputId} className="sr-only">{t('dashboard.searchPlaceholder')}</label>
                  <input
                    id={searchInputId}
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('dashboard.searchPlaceholder')}
                    enterKeyHint="search"
                    className="glass-input w-full text-xs py-2 px-3"
                  />
                </div>
              )}
            </div>

            {!rooms || rooms.length === 0 ? (
              <p className="text-white/70 italic">{t('dashboard.noSessions')}</p>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-white/75 text-sm">{t('dashboard.noSearchResults')}</p>
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="glass-button min-h-11 px-4 py-2 text-xs text-indigo-300 cursor-pointer"
                >
                  {t('dashboard.resetSearch')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRooms.map(r => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 bg-white/5 p-4 rounded-xl border border-white/10">
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/live/${r.code}`}
                        className="text-lg text-indigo-300 font-bold truncate block hover:text-indigo-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
                        title={t('dashboard.present')}
                      >
                        {r.question || r.type}
                      </Link>
                      <div className="text-xs text-white/75 mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-indigo-300 font-semibold">{r.code}</span>
                        <span className="uppercase text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/85">
                          {r.type}
                        </span>
                        <span>{new Date(r.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {role === 'SUPERADMIN' && r.user && (
                          <span className="bg-indigo-500/20 text-indigo-200 px-1.5 py-0.5 rounded text-[10px]">
                            {r.user.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Link 
                        to={`/live/${r.code}/report`} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-11 min-h-11 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" 
                        title={t('report.printPdf')}
                        aria-label={t('report.printPdf')}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        onClick={() => exportRoomToCSV(r)}
                        className="min-w-11 min-h-11 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        title={t('dashboard.exportCsv')}
                        aria-label={t('dashboard.exportCsv')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate(r)}
                        className="min-w-11 min-h-11 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        title={t('dashboard.duplicate')}
                        aria-label={t('dashboard.duplicate')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                          <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomToDelete(r)}
                        className="min-w-11 min-h-11 bg-red-500/20 text-red-200 hover:bg-red-500/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {activeTab === 'users' && role === 'SUPERADMIN' && (
        <div className="grid md:grid-cols-[4fr_7fr] gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">{t('dashboard.createUserTitle')}</h2>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label htmlFor={newUsernameId} className="block text-sm text-white/80 mb-2">{t('dashboard.usernameLabel')}</label>
                <input
                  id={newUsernameId}
                  type="text"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    if (userFormError) setUserFormError('');
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>
              {userFormError && (
                <div role="alert" className="text-red-300 text-sm bg-red-500/15 border border-red-500/30 p-2.5 rounded-lg">
                  {userFormError}
                </div>
              )}
              <button 
                type="submit" 
                disabled={creatingUser} 
                className="glow-button min-h-11 py-3 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {creatingUser && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {creatingUser ? t('dashboard.generatingUser') : t('dashboard.generateUserBtn')}
              </button>
            </form>

            {createdUser && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-300 font-bold mb-2">{t('dashboard.userCreated')}</p>
                <p className="text-sm text-white/80">{t('dashboard.userCredentialsHint')}</p>
                <div className="mt-3 p-3 bg-black/30 rounded font-mono text-sm space-y-1">
                  <p>{t('dashboard.userLabel')}: <span className="text-white font-bold">{createdUser.username}</span></p>
                  <p>{t('dashboard.passwordLabel')}: <span className="text-white font-bold">{createdUser.clearTextPassword}</span></p>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">{t('dashboard.allUsers')}</h2>
            <div className="flex flex-col gap-3">
              {users?.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                  <div>
                    <div className="text-lg font-bold text-white">{u.username}</div>
                    <div className="text-xs text-white/75 flex gap-2 mt-1">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded">{u.role}</span>
                      <span>{t('dashboard.sessionsCount', { count: u._count?.rooms || 0 })}</span>
                    </div>
                  </div>
                  {u.role !== 'SUPERADMIN' && (
                    <button
                      type="button"
                      onClick={() => setUserToDelete(u)}
                      className="min-w-11 min-h-11 bg-red-500/20 text-red-200 hover:bg-red-500/40 rounded-lg transition-colors flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      title={t('dashboard.deleteUserTitle')}
                      aria-label={t('dashboard.deleteUserTitle')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'settings' && role !== 'SUPERADMIN' && (
        <div className="max-w-md">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">{t('dashboard.changePassword')}</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label htmlFor={oldPasswordId} className="block text-sm text-white/80 mb-2">{t('dashboard.oldPassword')}</label>
                <input
                  id={oldPasswordId}
                  name="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                  className="glass-input w-full text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor={newPasswordId} className="block text-sm text-white/80 mb-2">{t('dashboard.newPassword')}</label>
                <input
                  id={newPasswordId}
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="glass-input w-full text-sm"
                  minLength="6"
                  required
                />
              </div>
              <div>
                <label htmlFor={confirmPasswordId} className="block text-sm text-white/80 mb-2">{t('dashboard.confirmNewPassword')}</label>
                <input
                  id={confirmPasswordId}
                  name="newPasswordConfirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="glass-input w-full text-sm"
                  minLength="6"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={savingPassword} 
                className="glow-button min-h-11 py-3 mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {savingPassword && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {savingPassword ? t('dashboard.saving') : t('dashboard.savePassword')}
              </button>
            </form>
            {pwdMessage.text && (
              <div
                role="status"
                className={`mt-4 p-3 rounded-lg text-sm text-center ${pwdMessage.type === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}
              >
                {pwdMessage.text}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Delete Room Modal */}
      <Modal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        title={t('dashboard.deleteConfirmTitle')}
        description={`${t('dashboard.deleteConfirmText')} ("${roomToDelete?.question || roomToDelete?.code}")`}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        isConfirmLoading={isDeleting}
        onConfirm={confirmDeleteRoom}
      />

      {/* Delete User Modal */}
      <Modal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        title={t('dashboard.deleteUserTitle')}
        description={t('dashboard.deleteUserConfirm', { username: userToDelete?.username || '' })}
        confirmText={t('common.delete')}
        confirmVariant="danger"
        isConfirmLoading={isDeleting}
        onConfirm={confirmDeleteUser}
      />

      <Footer showHelp={true} />
    </div>
  );
}
