import React, { useState, useContext, useCallback, useEffect } from 'react';
import { AdminAuthContext } from './contexts/AdminAuthContext';
import LoginForm from './components/LoginForm';

const App: React.FC = () => {
    const { isAuthenticated, user, logout, login, token } = useContext(AdminAuthContext);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'gym' | 'routines' | 'users'>('dashboard');
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showAddRoutineModal, setShowAddRoutineModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedUserForAssignment, setSelectedUserForAssignment] = useState<any>(null);
    const [gymInfo, setGymInfo] = useState<any>(null);
    const [gymName, setGymName] = useState('');
    const [gymLocation, setGymLocation] = useState('');
    const [gymUsers, setGymUsers] = useState<any[]>([]);
    const [gymRoutines, setGymRoutines] = useState<any[]>([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newRoutineName, setNewRoutineName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const fetchData = useCallback(async () => {
        if (!token) return;

        try {
            // Fetch Gym Info
            const gymRes = await fetch('/api/gym/info', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const gymData = await gymRes.json();
            if (gymData.gym) {
                setGymInfo(gymData.gym);
                setGymName(gymData.gym.name);
            }

            // Fetch Users
            const usersRes = await fetch('/api/gym/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const usersData = await usersRes.json();
            if (usersData.users) setGymUsers(usersData.users);

            // Fetch Routines
            const routinesRes = await fetch('/api/gym/routines', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const routinesData = await routinesRes.json();
            if (routinesData.routines) setGymRoutines(routinesData.routines);

        } catch (error) {
            console.error('Failed to fetch admin data', error);
        }
    }, [token]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, fetchData]);

    const handleSaveGym = async () => {
        if (!gymName) return;
        setIsSaving(true);
        try {
            await fetch('/api/gym/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: gymName })
            });
            await fetchData();
        } catch (err) {
            alert('Failed to save gym info');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/gym/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: newUserEmail, password: newUserPassword })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setShowAddUserModal(false);
            setNewUserEmail('');
            setNewUserPassword('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to add user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddRoutine = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/gym/routines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newRoutineName })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setShowAddRoutineModal(false);
            setNewRoutineName('');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to create routine');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAssignRoutine = async (routineId: string) => {
        if (!selectedUserForAssignment) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/gym/assign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: selectedUserForAssignment.id,
                    routineId
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setShowAssignModal(false);
            setSelectedUserForAssignment(null);
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to assign routine');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-white text-3xl font-bold">G</span>
                        </div>
                        <h1 className="text-3xl font-bold">Gym Admin</h1>
                        <p className="text-text-secondary mt-2">Manage your gym and members</p>
                    </div>
                    <div className="bg-surface p-8 rounded-2xl border border-surface-highlight shadow-xl">
                        <LoginForm
                            onSubmit={async (email, password) => {
                                setIsLoggingIn(true);
                                setLoginError(null);
                                try {
                                    const result = await login(email, password);
                                    if (!result.success) {
                                        setLoginError(result.error || 'Login failed');
                                    }
                                } finally {
                                    setIsLoggingIn(false);
                                }
                            }}
                            isLoading={isLoggingIn}
                            error={loginError}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden min-h-screen">
            {/* Header */}
            <header className="flex items-center justify-between p-4 bg-surface border-b border-surface-highlight">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold">G</span>
                    </div>
                    <h1 className="text-xl font-bold">Gym Admin</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-text-secondary">{user?.email}</span>
                    <button
                        onClick={logout}
                        className="text-sm text-danger hover:underline"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Sidebar / Navigation */}
            <div className="flex flex-1 overflow-hidden">
                <nav className="w-64 bg-surface/50 border-r border-surface-highlight flex flex-col p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`p-2 rounded-lg text-left transition-colors ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'hover:bg-surface-highlight text-text-secondary'}`}
                    >
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('gym')}
                        className={`p-2 rounded-lg text-left transition-colors ${activeTab === 'gym' ? 'bg-primary text-white' : 'hover:bg-surface-highlight text-text-secondary'}`}
                    >
                        My Gym
                    </button>
                    <button
                        onClick={() => setActiveTab('routines')}
                        className={`p-2 rounded-lg text-left transition-colors ${activeTab === 'routines' ? 'bg-primary text-white' : 'hover:bg-surface-highlight text-text-secondary'}`}
                    >
                        Routines
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`p-2 rounded-lg text-left transition-colors ${activeTab === 'users' ? 'bg-primary text-white' : 'hover:bg-surface-highlight text-text-secondary'}`}
                    >
                        Users
                    </button>
                </nav>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold">Welcome back!</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-surface p-6 rounded-xl border border-surface-highlight">
                                    <h3 className="text-text-secondary text-sm font-medium">Total Users</h3>
                                    <p className="text-3xl font-bold mt-2">{gymInfo?.userCount || 0}</p>
                                </div>
                                <div className="bg-surface p-6 rounded-xl border border-surface-highlight">
                                    <h3 className="text-text-secondary text-sm font-medium">Active Routines</h3>
                                    <p className="text-3xl font-bold mt-2">{gymInfo?.routineCount || 0}</p>
                                </div>
                                <div className="bg-surface p-6 rounded-xl border border-surface-highlight">
                                    <h3 className="text-text-secondary text-sm font-medium">Gym Status</h3>
                                    <p className="text-3xl font-bold mt-2">{gymInfo ? 'Active' : 'Pending Setup'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'gym' && (
                        <div className="max-w-2xl space-y-6">
                            <h2 className="text-2xl font-bold">Gym Settings</h2>
                            <div className="bg-surface p-6 rounded-xl border border-surface-highlight space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Gym Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 focus:border-primary outline-none"
                                        placeholder="Enter gym name"
                                        value={gymName}
                                        onChange={(e) => setGymName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full bg-background border border-surface-highlight rounded-lg px-4 py-2 focus:border-primary outline-none"
                                        placeholder="City, Country"
                                        value={gymLocation}
                                        onChange={(e) => setGymLocation(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleSaveGym}
                                    disabled={isSaving || !gymName}
                                    className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Gym Profile'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'routines' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Gym Routines</h2>
                                <button
                                    onClick={() => setShowAddRoutineModal(true)}
                                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                                >
                                    Create New Routine
                                </button>
                            </div>
                            <div className="bg-surface rounded-xl border border-surface-highlight overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-surface-highlight/50">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Exercises</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Active Users</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-highlight">
                                        {gymRoutines.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-text-secondary">
                                                    <div className="flex flex-col items-center">
                                                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                        </svg>
                                                        <p>No routines created yet.</p>
                                                        <p className="text-sm mt-1">Define your first gym routine to share with members.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            gymRoutines.map(r => (
                                                <tr key={r.id} className="hover:bg-surface-highlight/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium">{r.name}</td>
                                                    <td className="px-6 py-4 text-text-secondary">{r.exercisesCount || 0} exercises</td>
                                                    <td className="px-6 py-4 text-text-secondary">{r.usersCount || 0} users</td>
                                                    <td className="px-6 py-4">
                                                        <button className="text-primary hover:underline text-sm mr-4 font-medium">Edit</button>
                                                        <button className="text-danger hover:underline text-sm font-medium">Delete</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add Routine Modal */}
                            {showAddRoutineModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                                    <div className="bg-surface border border-surface-highlight rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold">Define Routine</h3>
                                            <button onClick={() => setShowAddRoutineModal(false)} className="text-text-secondary hover:text-text-primary">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <form className="space-y-4" onSubmit={handleAddRoutine}>
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-1">Routine Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                                                    placeholder="e.g. Upper Body Power"
                                                    value={newRoutineName}
                                                    onChange={(e) => setNewRoutineName(e.target.value)}
                                                />
                                            </div>
                                            <div className="p-8 border-2 border-dashed border-surface-highlight rounded-xl text-center">
                                                <p className="text-text-secondary">Exercise selection UI would go here.</p>
                                                <p className="text-xs mt-2 italic text-text-secondary/60">(Complex exercise builder planned for next step)</p>
                                            </div>
                                            <div className="pt-4 flex space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddRoutineModal(false)}
                                                    className="flex-1 px-4 py-3 border border-surface-highlight rounded-xl font-semibold hover:bg-surface-highlight transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSaving || !newRoutineName}
                                                    className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                                >
                                                    {isSaving ? 'Saving...' : 'Save Routine'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">Manage Users</h2>
                                <button
                                    onClick={() => setShowAddUserModal(true)}
                                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                                >
                                    Add New User
                                </button>
                            </div>
                            <div className="bg-surface rounded-xl border border-surface-highlight overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-surface-highlight/50">
                                        <tr>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Joined At</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Routines</th>
                                            <th className="px-6 py-3 text-sm font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-surface-highlight">
                                        {gymUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-text-secondary">
                                                    <div className="flex flex-col items-center">
                                                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                        </svg>
                                                        <p>No users registered in your gym yet.</p>
                                                        <p className="text-sm mt-1">Start by adding your first member.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            gymUsers.map(u => (
                                                <tr key={u.id} className="hover:bg-surface-highlight/30 transition-colors">
                                                    <td className="px-6 py-4">{u.email}</td>
                                                    <td className="px-6 py-4 text-sm text-text-secondary">
                                                        {new Date(u.joinedAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="bg-surface-highlight px-2 py-1 rounded text-xs">
                                                            {u.routinesCount || 0} Assigned
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUserForAssignment(u);
                                                                setShowAssignModal(true);
                                                            }}
                                                            className="text-primary hover:underline text-sm mr-4 font-medium"
                                                        >
                                                            Assign Routine
                                                        </button>
                                                        <button className="text-danger hover:underline text-sm font-medium">Remove</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add User Modal */}
                            {showAddUserModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                                    <div className="bg-surface border border-surface-highlight rounded-2xl w-full max-w-md p-6 shadow-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold">Add Gym Member</h3>
                                            <button onClick={() => setShowAddUserModal(false)} className="text-text-secondary hover:text-text-primary">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <form className="space-y-4" onSubmit={handleAddUser}>
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                                                <input
                                                    type="email"
                                                    required
                                                    className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                                                    placeholder="member@example.com"
                                                    value={newUserEmail}
                                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-text-secondary mb-1">Initial Password</label>
                                                <input
                                                    type="password"
                                                    required
                                                    className="w-full bg-background border border-surface-highlight rounded-xl px-4 py-3 focus:border-primary outline-none transition-colors"
                                                    placeholder="••••••••"
                                                    value={newUserPassword}
                                                    onChange={(e) => setNewUserPassword(e.target.value)}
                                                />
                                                <p className="text-xs text-text-secondary mt-2">The user will be able to change this later.</p>
                                            </div>
                                            <div className="pt-4 flex space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAddUserModal(false)}
                                                    className="flex-1 px-4 py-3 border border-surface-highlight rounded-xl font-semibold hover:bg-surface-highlight transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSaving || !newUserEmail || !newUserPassword}
                                                    className="flex-1 bg-primary text-white px-4 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                                                >
                                                    {isSaving ? 'Creating...' : 'Create & Add'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* Assign Routine Modal */}
                            {showAssignModal && (
                                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                                    <div className="bg-surface border border-surface-highlight rounded-2xl w-full max-w-md p-6 shadow-2xl">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold">Assign Routine</h3>
                                            <button onClick={() => setShowAssignModal(false)} className="text-text-secondary hover:text-text-primary">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm text-text-secondary mb-4">Select a routine for {selectedUserForAssignment?.email}:</p>
                                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                                {gymRoutines.length === 0 ? (
                                                    <p className="text-center py-8 text-text-secondary italic">No routines created yet.</p>
                                                ) : (
                                                    gymRoutines.map(r => (
                                                        <button
                                                            key={r.id}
                                                            onClick={() => handleAssignRoutine(r.id)}
                                                            disabled={isSaving}
                                                            className="w-full flex items-center justify-between p-4 bg-background border border-surface-highlight rounded-xl hover:border-primary group transition-all"
                                                        >
                                                            <div className="text-left">
                                                                <p className="font-semibold group-hover:text-primary transition-colors">{r.name}</p>
                                                                <p className="text-xs text-text-secondary">{r.exercisesCount || 0} exercises</p>
                                                            </div>
                                                            <svg className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setShowAssignModal(false)}
                                                className="w-full mt-4 px-4 py-3 border border-surface-highlight rounded-xl font-semibold hover:bg-surface-highlight transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;
