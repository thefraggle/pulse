import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { exportRoomToCSV } from '../utils/exportUtils';
import { startDashboardTour } from '../utils/tourUtils';

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [type, setType] = useState('WORDCLOUD');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [wordLimit, setWordLimit] = useState(4);
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' or 'users'
  const [newUsername, setNewUsername] = useState('');
  const [createdUser, setCreatedUser] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });

  const navigate = useNavigate();
  const token = localStorage.getItem('pulse_token');
  const role = localStorage.getItem('pulse_role');
  const username = localStorage.getItem('pulse_username');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchRooms();
    if (role === 'SUPERADMIN') fetchUsers();
  }, [navigate, token, role]);

  useEffect(() => {
    if (activeTab === 'rooms') {
      setTimeout(() => startDashboardTour(), 500);
    }
    const handleStartTour = () => {
      if (activeTab === 'rooms') startDashboardTour(true);
    };
    window.addEventListener('start-tour', handleStartTour);
    return () => window.removeEventListener('start-tour', handleStartTour);
  }, [activeTab]);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        navigate('/login');
        return;
      }
      const data = await res.json();
      setRooms(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    let finalOptions = options.filter(o => o.trim() !== '');
    
    if ((type === 'POLL' || type === 'RANKING') && finalOptions.length < 2) {
      alert('Please enter at least 2 options');
      return;
    }
    
    if (type === 'RATING' && finalOptions.length === 0) {
      finalOptions = ['Overall Rating'];
    }

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
      const data = await res.json();
      navigate(`/live/${data.code}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Really delete?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRooms();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloneRoom = async (room) => {
    if (!confirm('Restart session (old session will be deleted, new code generated)?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: room.type,
          question: room.question,
          wordLimit: room.wordLimit,
          options: room.options ? room.options.map(o => o.text) : [],
          userId: room.userId
        })
      });
      const data = await res.json();
      
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/rooms/${room.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      navigate(`/live/${data.code}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername })
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data);
        setNewUsername('');
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Really delete user and ALL their sessions?')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchUsers();
      fetchRooms();
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwdMessage({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setPwdMessage({ text: 'New passwords do not match.', type: 'error' });
      return;
    }
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
        setPwdMessage({ text: 'Password successfully changed!', type: 'success' });
        setOldPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
      } else {
        setPwdMessage({ text: data.error || 'Error changing password', type: 'error' });
      }
    } catch (e) {
      setPwdMessage({ text: 'Connection error', type: 'error' });
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => setOptions([...options, '']);

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-white/50 text-sm mt-1">Logged in as: <span className="text-white">{username}</span></p>
        </div>
        <button 
          onClick={() => {
            localStorage.clear();
            navigate('/login');
          }}
          className="text-white/50 hover:text-white"
        >
          Logout
        </button>
      </div>

      <div className="flex gap-4 mb-8 border-b border-white/10 pb-2">
        <button 
          className={`font-bold pb-2 ${activeTab === 'rooms' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/50'}`}
          onClick={() => setActiveTab('rooms')}
        >
          Sessions
        </button>
        {role === 'SUPERADMIN' && (
          <button 
            className={`font-bold pb-2 ${activeTab === 'users' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/50'}`}
            onClick={() => setActiveTab('users')}
          >
            User Management
          </button>
        )}
        {role !== 'SUPERADMIN' && (
          <button 
            className={`font-bold pb-2 ${activeTab === 'settings' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/50'}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        )}
      </div>

      {activeTab === 'rooms' && (
        <div className="grid md:grid-cols-[4fr_7fr] gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6" id="tour-create-session">
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Create New Session</h2>
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Type</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="glass-input w-full bg-black/20"
                >
                  <option value="WORDCLOUD">Wordcloud</option>
                  <option value="POLL">Poll</option>
                  <option value="QNA">Q&A (Questions & Answers)</option>
                  <option value="OPEN_ENDED">Open Ended (Brainstorming)</option>
                  <option value="RANKING">Ranking (Prioritization)</option>
                  <option value="RATING">Rating Scale</option>
                </select>
                <div className="text-xs text-white/50 mt-2 bg-white/5 p-2 rounded border border-white/5">
                  {type === 'WORDCLOUD' && 'Collects terms from participants and displays them as a dynamic word cloud. Frequent terms appear larger.'}
                  {type === 'POLL' && 'Klassische Single-Choice Poll. Die Teilnehmer wählen genau eine der vordefinierten Antworten.'}
                  {type === 'QNA' && 'Participants can submit their own questions and upvote questions from others.'}
                  {type === 'OPEN_ENDED' && 'Collects free-text answers to a question. Ideal for brainstorming or detailed feedback.'}
                  {type === 'RANKING' && 'Participants sort the given options into their preferred order.'}
                  {type === 'RATING' && 'Participants rate given statements or options on a 5-star scale.'}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Question / Title</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How are you today?"
                  className="glass-input w-full text-sm"
                />
              </div>

              {type === 'WORDCLOUD' && (
                <div>
                  <label className="block text-sm text-white/70 mb-2">Submissions per participant</label>
                  <input
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
                  <label className="block text-sm text-white/70">Options</label>
                  {options.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="glass-input w-full text-sm py-2"
                    />
                  ))}
                  <button type="button" onClick={addOption} className="text-sm text-indigo-400 text-left mt-1 hover:text-indigo-300">
                    + Add Option
                  </button>
                </div>
              )}

              <button type="submit" className="glow-button py-3 mt-4">
                Start Session
              </button>
            </form>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6" id="tour-active-sessions">
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Active Sessions</h2>
            {!rooms || rooms.length === 0 ? (
              <p className="text-white/40 italic">No active sessions</p>
            ) : (
              <div className="flex flex-col gap-3">
                {rooms?.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                    <div>
                      <Link to={`/live/${r.code}`} className="text-lg text-indigo-300 font-bold truncate max-w-[320px] hover:text-indigo-200 transition-colors block" title="To Live View">
                        {r.question || r.type}
                      </Link>
                      <div className="text-xs text-white/50 mt-1 flex items-center gap-2">
                        <span className="uppercase text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/70">
                          {r.type}
                        </span>
                        <span>{new Date(r.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                        {role === 'SUPERADMIN' && r.user && (
                          <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                            {r.user.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => exportRoomToCSV(r)} className="p-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 rounded transition-colors" title="Export to CSV">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button onClick={() => handleCloneRoom(r)} className="p-2 bg-white/10 hover:bg-white/20 rounded transition-colors text-white/70 hover:text-white" title="Clone session (new code)">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                          <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/40 rounded transition-colors" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Username (e.g. Teacher1)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>
              <button type="submit" className="glow-button py-3 mt-2">
                Generate User & Password
              </button>
            </form>

            {createdUser && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 font-bold mb-2">User created successfully!</p>
                <p className="text-sm text-white/70">Please note the credentials and pass them on:</p>
                <div className="mt-3 p-3 bg-black/30 rounded font-mono text-sm space-y-1">
                  <p>User: <span className="text-white font-bold">{createdUser.username}</span></p>
                  <p>Password: <span className="text-white font-bold">{createdUser.clearTextPassword}</span></p>
                </div>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">All Users</h2>
            <div className="flex flex-col gap-3">
              {users?.map(u => (
                <div key={u.id} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
                  <div>
                    <div className="text-lg font-bold text-white">{u.username}</div>
                    <div className="text-xs text-white/50 flex gap-2 mt-1">
                      <span className="bg-white/10 px-1.5 py-0.5 rounded">{u.role}</span>
                      <span>{u._count?.rooms || 0} Sessions</span>
                    </div>
                  </div>
                  {u.role !== 'SUPERADMIN' && (
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-red-500/20 text-red-300 hover:bg-red-500/40 rounded transition-colors" title="Delete User">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
            <h2 className="text-xl font-bold mb-6 border-b border-white/10 pb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Old Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="glass-input w-full text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input w-full text-sm"
                  minLength="6"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">New Password wiederholen</label>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="glass-input w-full text-sm"
                  minLength="6"
                  required
                />
              </div>
              <button type="submit" className="glow-button py-3 mt-2">
                Save Password
              </button>
            </form>
            {pwdMessage.text && (
              <div className={`mt-4 p-3 rounded-lg text-sm text-center ${pwdMessage.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {pwdMessage.text}
              </div>
            )}
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
}
