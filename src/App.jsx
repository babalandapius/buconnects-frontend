import React, { useState, useEffect } from 'react' // Added useEffect
import './App.css'
import JoinPage from './JoinPage.jsx'
import Dashboard from './Dashboard.jsx'

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('buUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      localStorage.removeItem('buUser'); // Clear corrupted data
      return null;
    }
  });

  // NEW: Sync with database on load
  useEffect(() => {
    const syncUser = async () => {
      if (user && user.id) {
        try {
          const response = await fetch(`API_BASE_URL/api/user/${user.id}`);
          if (response.ok) {
            const latestData = await response.json();
            setUser(latestData);
            localStorage.setItem("buUser", JSON.stringify(latestData));
          }
        } catch (err) {
          console.error("Sync failed", err);
        }
      }
    };
    syncUser();
  }, []); // Runs once when the app starts

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("buUser", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("buUser");
  }

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("buUser", JSON.stringify(updatedUser));
  }

  return(
    <div className='App'>
      {!user ? (
        <JoinPage onJoinSuccess={handleLogin} />
      ): (
        <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUserUpdate}/>
      )}
    </div>
  );
}

export default App;