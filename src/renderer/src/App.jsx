import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useState, useEffect } from 'react'
import AuthPage from './AuthPage'
import RCPage from './Recording-controls'
import { OverlayPage } from './OverlayPage/OverlayPage'

function App() {
  // const ipcHandle = () => window.electron.ipcRenderer.send('ping')
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'))

  useEffect(() => {
    console.log('App mounted, authToken:', authToken)
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem('authToken'))
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [authToken])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={authToken ? <Navigate to="/" /> : <AuthPage setAuthToken={setAuthToken} />} />

        <Route
          path="/recording-controls"
          element={authToken ? <RCPage setAuthToken={setAuthToken} /> : <AuthPage setAuthToken={setAuthToken} />}
        />
        <Route
          path="/overlay"
          element={<OverlayPage />}
        />
        <Route
          path="/"
          element={authToken ? <Navigate to="/recording-controls" /> : <Navigate to="/login" />}
        />
      </Routes>
    </HashRouter>
  )
}

export default App
