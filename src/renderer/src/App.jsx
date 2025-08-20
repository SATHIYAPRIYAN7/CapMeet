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

  const [isMicMuted, setIsMicMuted] = useState(false)

  useEffect(()=>{
   console.log(isMicMuted, "isMicMuted")
  },[isMicMuted])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={authToken ? <Navigate to="/" /> : <AuthPage setAuthToken={setAuthToken} />} />

        <Route
          path="/recording-controls"
          element={authToken ? <RCPage setAuthToken={setAuthToken} setIsMicMuted={setIsMicMuted} /> : <AuthPage setAuthToken={setAuthToken} />}
        />
        <Route
          path="/overlay"
          element={<OverlayPage isMicMuted={isMicMuted} setIsMicMuted={setIsMicMuted} />}
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
