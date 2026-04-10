import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Trash2, 
  AlertTriangle,
  Edit2,
  Save,
  X,
  Database,
  Shield,
  Eye,
  EyeOff,
  Building,
  Lock
} from 'lucide-react';
import RefreshAppButton from './RefreshAppButton';
import { 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  writeBatch,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db } from '../firebase/config';
import { getYearlyStats, getAllTimeStats } from '../services/analyticsService';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { isAdminUser } from '../utils/adminAccess';

const Profile = () => {
  const { currentUser, logout, getUserNickname, refreshNickname, userNickname: contextNickname } = useAuth();
  const { online } = useOnlineStatus();
  const [userNickname, setUserNickname] = useState('');
  const [editingNickname, setEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [totalDaysTracked, setTotalDaysTracked] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataType, setClearDataType] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const [isMasjidModeEnabled, setIsMasjidModeEnabled] = useState(false);
// --- Admin Delete User Modal State ---
const [adminUserList, setAdminUserList] = useState([]);
const [showAdminDeleteModal, setShowAdminDeleteModal] = useState(false);
const [userToDelete, setUserToDelete] = useState(null);

  const anyModalOpen = Boolean(
    userToDelete || showAdminDeleteModal || showClearDataModal || showDeleteConfirm
  );
  useModalDismiss(anyModalOpen, () => {
    if (userToDelete) setUserToDelete(null);
    else if (showAdminDeleteModal) setShowAdminDeleteModal(false);
    else if (showClearDataModal) setShowClearDataModal(false);
    else if (showDeleteConfirm) setShowDeleteConfirm(false);
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        try {
          const nickname = contextNickname || await getUserNickname();
          setUserNickname(nickname || 'User');
          setNewNickname(nickname || '');
          
          // Get user document to check privacy and masjid mode settings
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setIsPrivacyEnabled(userData.isPrivate || false);
            setIsMasjidModeEnabled(userData.masjidMode || false);
          } else {
            // For new users, set default values
            await updateDoc(userDocRef, {
              isPrivate: false,
              masjidMode: false
            });
          }
          
          // Total days tracked (aligned with Progress/Leaderboard logic)
          // Use all-time stats so it works with Firestore offline cache too
          const allStats = await getAllTimeStats(currentUser.uid, isMasjidModeEnabled);
          setTotalDaysTracked(allStats.totalDays || 0);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [currentUser, getUserNickname, contextNickname, isMasjidModeEnabled]);

  const handleNicknameEdit = () => {
    setEditingNickname(true);
    setNewNickname(userNickname);
  };

  const handleNicknameSave = async () => {
    if (!online) return;
    if (!newNickname.trim()) return;
    
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        nickname: newNickname.trim()
      });
      
      setUserNickname(newNickname.trim());
      setEditingNickname(false);
      
      // Refresh nickname in AuthContext to update across the entire app
      await refreshNickname();
    } catch (error) {
      console.error('Error updating nickname:', error);
      alert('Failed to update nickname. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameCancel = () => {
    setEditingNickname(false);
    setNewNickname(userNickname);
  };

  const handlePrivacyToggle = async () => {
    if (!online) return;
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const newPrivacyState = !isPrivacyEnabled;
      
      await updateDoc(userDocRef, {
        isPrivate: newPrivacyState
      });
      
      setIsPrivacyEnabled(newPrivacyState);
      alert(newPrivacyState 
        ? 'Privacy enabled: You are now hidden from global leaderboards' 
        : 'Privacy disabled: You are now visible on global leaderboards'
      );
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      alert('Failed to update privacy setting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMasjidModeToggle = async () => {
    if (!online) return;
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const newMasjidModeState = !isMasjidModeEnabled;
      
      await updateDoc(userDocRef, {
        masjidMode: newMasjidModeState
      });
      
      setIsMasjidModeEnabled(newMasjidModeState);
      alert(newMasjidModeState 
        ? 'Masjid Mode enabled: Prayer scoring adjusted for home prayers (Qaza: 13pts, Prayed: 27pts)' 
        : 'Masjid Mode disabled: Standard scoring enabled (Qaza: 0.5pts, Home: 1pt, Masjid: 27pts)'
      );
    } catch (error) {
      console.error('Error updating masjid mode setting:', error);
      alert('Failed to update masjid mode setting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearUserData = async (type) => {
    if (!online) return;
    try {
      setLoading(true);
      const batch = writeBatch(db);
      
      if (type === 'all') {
        // Delete all prayer data
        const prayersRef = collection(db, 'users', currentUser.uid, 'prayers');
        const prayersSnapshot = await getDocs(prayersRef);
        
        prayersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      } else if (type === 'year') {
        // Delete data for specific year
        const prayersRef = collection(db, 'users', currentUser.uid, 'prayers');
        const prayersSnapshot = await getDocs(prayersRef);
        
        prayersSnapshot.docs.forEach((doc) => {
          const dateStr = doc.id;
          const year = parseInt(dateStr.split('-')[0]);
          if (year === selectedYear) {
            batch.delete(doc.ref);
          }
        });
      } else if (type === 'month') {
        // Delete data for specific month
        const prayersRef = collection(db, 'users', currentUser.uid, 'prayers');
        const prayersSnapshot = await getDocs(prayersRef);
        
        prayersSnapshot.docs.forEach((doc) => {
          const dateStr = doc.id;
          const [year, month] = dateStr.split('-').map(Number);
          if (year === selectedYear && month === selectedMonth) {
            batch.delete(doc.ref);
          }
        });
      }
      
      await batch.commit();
      
      // Refresh total days tracked
      const currentYear = new Date().getFullYear();
      let totalDays = 0;
      
      for (let year = currentYear - 1; year <= currentYear; year++) {
        const yearStats = await getYearlyStats(currentUser.uid, year);
        totalDays += yearStats.totalDays;
      }
      
      setTotalDaysTracked(totalDays);
      setShowClearDataModal(false);
      alert('Data cleared successfully!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      
      // Delete all user data from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const prayersRef = collection(db, 'users', currentUser.uid, 'prayers');
      const prayersSnapshot = await getDocs(prayersRef);
      
      const batch = writeBatch(db);
      
      // Delete all prayer documents
      prayersSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Delete user document
      batch.delete(userDocRef);
      
      await batch.commit();
      
      // Delete Firebase Auth user
      await deleteUser(currentUser);
      
      // Logout
      await logout();
      
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const openClearDataModal = (type) => {
    setClearDataType(type);
    setShowClearDataModal(true);
  };

  if (!currentUser) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 sm:space-y-7">
      {!online && (
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/35 text-amber-950 dark:text-amber-100 text-sm px-4 py-3 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" strokeWidth={1.75} /> Offline: view-only until you reconnect.
        </div>
      )}
      <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 ring-1 ring-black/[0.045] dark:ring-white/[0.08] shadow-jj dark:shadow-jj-dark p-6 sm:p-8">
        <p className="jj-eyebrow">Account</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-jj-ink dark:text-stone-50 mt-1.5">
          Settings
        </h1>
        <p className="text-sm text-jj-muted dark:text-stone-400 mt-2.5 leading-relaxed max-w-prose text-pretty">
          Nickname, privacy, and data—kept plain and reversible where possible.
        </p>
      </div>

      <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 ring-1 ring-black/[0.045] dark:ring-white/[0.08] shadow-jj-card dark:shadow-jj-card-dark p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-jj-ink dark:text-stone-100 mb-5 flex items-center gap-2.5">
          <User className="w-5 h-5 text-jj-accent dark:text-teal-300 shrink-0" strokeWidth={1.75} />
          Profile
        </h2>
        
        <div className="space-y-4">
          {/* Nickname */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-jj-muted dark:text-stone-400 mb-1.5">Nickname</label>
              {editingNickname ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="flex-1 min-h-11 px-3.5 py-2 rounded-jj border border-jj-border dark:border-white/12 bg-jj-surface dark:bg-jj-canvas-dark text-jj-ink dark:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent"
                    placeholder="Enter nickname"
                  />
                  <button
                    onClick={handleNicknameSave}
                    disabled={loading || !online}
                    className={`p-2 rounded-lg ${!online ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:bg-green-50'}`}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNicknameCancel}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-lg font-medium text-jj-ink dark:text-stone-100">{userNickname}</p>
                  <button
                    type="button"
                    onClick={handleNicknameEdit}
                    className="p-2 text-jj-muted hover:text-jj-ink dark:text-stone-400 dark:hover:text-stone-200 rounded-jj hover:bg-jj-mist/60 dark:hover:bg-white/[0.05]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-jj-muted dark:text-stone-400 mb-1.5">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-jj-muted opacity-80 shrink-0" strokeWidth={1.75} />
              <p className="text-base sm:text-lg text-jj-ink dark:text-stone-100 break-all">{currentUser.email}</p>
            </div>
          </div>

          {/* Total Days Tracked */}
          <div>
            <label className="block text-sm font-medium text-jj-muted dark:text-stone-400 mb-1.5">Total days tracked</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-jj-muted opacity-80 shrink-0" strokeWidth={1.75} />
              <p className="text-lg font-medium tabular-nums text-jj-ink dark:text-stone-100">{totalDaysTracked} days</p>
            </div>
          </div>

          {/* Privacy Toggle */}
          <div>
            <label className="block text-sm font-medium text-jj-muted dark:text-stone-400 mb-2">Global leaderboard privacy</label>
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-jj-mist/50 dark:bg-white/[0.04] rounded-jj-xl ring-1 ring-black/[0.04] dark:ring-white/[0.07]">
              <div className="flex items-center gap-3 min-w-0">
                <Shield className="w-5 h-5 text-jj-accent dark:text-teal-300 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-semibold text-jj-ink dark:text-stone-100">
                    Private mode
                  </p>
                  <p className="text-xs text-jj-muted dark:text-stone-400 mt-0.5 leading-snug">
                    {isPrivacyEnabled 
                      ? 'Hidden from global leaderboards (friends can still see you)' 
                      : 'Visible on global leaderboards'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handlePrivacyToggle}
                disabled={loading || !online}
                title={!online ? 'Offline: view-only' : ''}
                className={`relative inline-flex h-7 w-12 items-center shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-surface dark:focus-visible:ring-offset-jj-surface-dark-2 ${
                  isPrivacyEnabled ? 'bg-jj-accent dark:bg-teal-600' : 'bg-jj-mist dark:bg-white/15'
                } ${!online ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full bg-white transition-all duration-200 ease-in-out ${
                    isPrivacyEnabled 
                      ? 'left-[0.875rem] md:left-6' 
                      : 'left-1'
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-jj-muted dark:text-stone-500">
              {isPrivacyEnabled ? (
                <><EyeOff className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> Hidden from global boards; friends may still see you.</>
              ) : (
                <><Eye className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> Visible on global leaderboards.</>
              )}
            </div>
          </div>

          {/* Masjid Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-jj-muted dark:text-stone-400 mb-2">Prayer scoring mode</label>
            <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-jj-mist/50 dark:bg-white/[0.04] rounded-jj-xl ring-1 ring-black/[0.04] dark:ring-white/[0.07]">
              <div className="flex items-center gap-3 min-w-0">
                <Building className="w-5 h-5 text-jj-accent dark:text-teal-300 shrink-0" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-semibold text-jj-ink dark:text-stone-100">
                    Home prayer mode
                  </p>
                  <p className="text-xs text-jj-muted dark:text-stone-400 mt-0.5 leading-snug">
                    {isMasjidModeEnabled 
                      ? 'Optimized for home prayers (Qaza: 13pts, Prayed: 27pts)' 
                      : 'Standard scoring (Qaza: 0.5pts, Home: 1pt, Masjid: 27pts)'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleMasjidModeToggle}
                disabled={loading || !online}
                title={!online ? 'Offline: view-only' : ''}
                className={`relative inline-flex h-7 w-12 items-center shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-surface dark:focus-visible:ring-offset-jj-surface-dark-2 ${
                  isMasjidModeEnabled ? 'bg-jj-accent dark:bg-teal-600' : 'bg-jj-mist dark:bg-white/15'
                } ${!online ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute h-4 w-4 rounded-full bg-white transition-all duration-200 ease-in-out ${
                    isMasjidModeEnabled 
                      ? 'left-[0.875rem] md:left-6' 
                      : 'left-1'
                  }`}
                />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-jj-muted dark:text-stone-500">
              {isMasjidModeEnabled ? (
                <><Building className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> Home-optimized scoring is on.</>
              ) : (
                <><Building className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} /> Standard scoring includes masjid weighting.</>
              )}
            </div>
          </div>
        </div>
      </div>

      <RefreshAppButton />

      <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 ring-1 ring-black/[0.045] dark:ring-white/[0.08] shadow-jj-card dark:shadow-jj-card-dark p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-jj-ink dark:text-stone-100 mb-4 flex items-center gap-2.5">
          <Database className="w-5 h-5 text-jj-accent dark:text-teal-300 shrink-0" strokeWidth={1.75} />
          Data management
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-jj-muted dark:text-stone-400 leading-relaxed">Clear prayer data for a period or all at once—use only when you mean it.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => openClearDataModal('month')}
              disabled={!online}
              title={!online ? 'Offline: view-only' : ''}
              className={`p-3 border text-yellow-700 rounded-lg transition-colors ${!online ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-yellow-300 hover:bg-yellow-50'}`}
            >
              Clear Month Data
            </button>
            <button
              onClick={() => openClearDataModal('year')}
              disabled={!online}
              title={!online ? 'Offline: view-only' : ''}
              className={`p-3 border text-orange-700 rounded-lg transition-colors ${!online ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-orange-300 hover:bg-orange-50'}`}
            >
              Clear Year Data
            </button>
            <button
              onClick={() => openClearDataModal('all')}
              disabled={!online}
              title={!online ? 'Offline: view-only' : ''}
              className={`p-3 border text-red-700 rounded-lg transition-colors ${!online ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-red-300 hover:bg-red-50'}`}
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 ring-1 ring-black/[0.045] dark:ring-white/[0.08] shadow-jj-card dark:shadow-jj-card-dark p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-semibold text-jj-ink dark:text-stone-100 mb-4 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" strokeWidth={1.75} />
          Account actions
        </h2>
        
        <div className="space-y-4">
          <p className="text-sm text-jj-muted dark:text-stone-400 leading-relaxed">Permanently delete your account and all associated data.</p>
          
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!online}
            title={!online ? 'Offline: view-only' : ''}
            className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${!online ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
        </div>
      </div>

      {/* Clear Data Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="jj-modal-clear-data-title"
            className="bg-jj-surface dark:bg-jj-surface-dark rounded-3xl border border-jj-border dark:border-white/10 p-6 max-w-md w-full shadow-jj dark:shadow-jj-dark"
          >
            <h3 id="jj-modal-clear-data-title" className="text-lg font-semibold text-jj-ink dark:text-stone-100 mb-4">
              Clear {clearDataType === 'all' ? 'All' : clearDataType === 'year' ? 'Year' : 'Month'} Data
            </h3>
            
            {clearDataType === 'month' && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium text-gray-600">Select Month & Year</label>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>{year}</option>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
            
            {clearDataType === 'year' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">Select Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>
            )}
            
            <p className="text-gray-600 mb-6">
              This action cannot be undone. Are you sure you want to clear this data?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => clearUserData(clearDataType)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Clearing...' : 'Clear Data'}
              </button>
              <button
                onClick={() => setShowClearDataModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="jj-modal-delete-account-title"
            className="bg-jj-surface dark:bg-jj-surface-dark rounded-3xl border border-jj-border dark:border-white/10 p-6 max-w-md w-full shadow-jj dark:shadow-jj-dark"
          >
            <h3 id="jj-modal-delete-account-title" className="text-lg font-semibold text-jj-ink dark:text-stone-100 mb-4">Delete Account</h3>
            <p className="text-jj-muted dark:text-stone-400 mb-6">
              This will permanently delete your account and all your prayer tracking data. 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Admin-only Delete User Button for Abrar Husain */}
    {isAdminUser(currentUser, userNickname) && (
      <div className="mt-8 flex justify-center">
        <button
          onClick={async () => {
            setLoading(true);
            try {
              // Fetch all users for admin modal
              const usersSnapshot = await getDocs(collection(db, 'users'));
              setAdminUserList(usersSnapshot.docs.map(doc => {
  const data = doc.data();
  // Mask email if present in Firestore, but do not fetch or display it directly
  let maskedEmail = 'Hidden';
  if (data.email) {
    const [user, domain] = data.email.split('@');
    maskedEmail = user[0] + '***@***.' + (domain ? domain.split('.').pop() : 'com');
  }
  return {
    id: doc.id,
    nickname: data.nickname || data.displayName || 'No Nickname',
    maskedEmail
  };
}));
              setShowAdminDeleteModal(true);
            } catch (err) {
              alert('Failed to fetch users: ' + (err?.message || err));
            } finally {
              setLoading(false);
            }
          }}
          className="px-6 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 shadow-lg transition-colors"
        >
          Delete Any User (Admin Only)
        </button>
      </div>
    )}

    {/* Admin Delete User Modal */}
    {showAdminDeleteModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="jj-modal-admin-delete-title"
          className="bg-jj-surface dark:bg-jj-elevated-dark rounded-xl p-6 max-w-2xl w-full mx-4 overflow-y-auto max-h-[90vh] border border-jj-border dark:border-white/10"
        >
          <h3 id="jj-modal-admin-delete-title" className="text-lg font-semibold text-jj-ink dark:text-stone-100 mb-4">Delete Any User (Admin Only)</h3>
          <p className="text-jj-muted dark:text-stone-400 mb-6">Select a user to delete. This action is permanent and cannot be undone.</p>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 border">Nickname</th>
                  <th className="px-3 py-2 border">Masked Email</th>
                  <th className="px-3 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminUserList.map(user => (
                  <tr key={user.id} className="border-b">
                    <td className="px-3 py-2 border">{user.nickname || user.displayName || 'No Nickname'}</td>
                    <td className="px-3 py-2 border">{user.maskedEmail}</td>
                    <td className="px-3 py-2 border">
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() => setUserToDelete(user)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowAdminDeleteModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Per-user Confirm Delete Modal */}
    {userToDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="jj-modal-admin-confirm-title"
          className="bg-jj-surface dark:bg-jj-elevated-dark rounded-xl p-6 max-w-md w-full mx-4 border border-jj-border dark:border-white/10"
        >
          <h3 id="jj-modal-admin-confirm-title" className="text-lg font-semibold text-jj-ink dark:text-stone-100 mb-4">Confirm Delete</h3>
          <p className="text-jj-muted dark:text-stone-400 mb-6">
            Are you sure you want to delete user <span className="font-bold">{userToDelete.nickname || userToDelete.displayName || userToDelete.email}</span>?<br />
            This will permanently delete their account and all data. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  // Delete user document from Firestore
                  const userDocRef = doc(db, 'users', userToDelete.id);
                  await getDocs(collection(userDocRef, 'prayers')).then(snapshot => {
                    const batch = writeBatch(db);
                    snapshot.forEach(docSnap => batch.delete(docSnap.ref));
                    return batch.commit();
                  });
                  await getDocs(collection(userDocRef, 'other')).then(snapshot => {
                    const batch = writeBatch(db);
                    snapshot.forEach(docSnap => batch.delete(docSnap.ref));
                    return batch.commit();
                  }).catch(() => {});
                  await updateDoc(userDocRef, {});
const userDocSnap = await getDoc(userDocRef);
if (userDocSnap.exists()) {
  await deleteDoc(userDocRef);
}
                  // Optionally: delete from Auth via backend admin SDK (cannot from frontend)
                  // Remove from local list
                  setAdminUserList(list => list.filter(u => u.id !== userToDelete.id));
                  setUserToDelete(null);
                  alert('User deleted from Firestore. (Note: Auth deletion requires server-side admin privileges.)');
                } catch (err) {
                  alert('Failed to delete user: ' + (err?.message || err));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setUserToDelete(null)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

  </div>
  );
};

export default Profile;
