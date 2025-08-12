import { useEffect, useState } from 'react'
import LoginView from './Login.view'
import { CircleMinus } from 'lucide-react'
import { RiCloseCircleFill } from 'react-icons/ri'

const AuthPageView = () => {
  const [isMacOS, setIsMacOS] = useState(false)
  useEffect(() => {
    setIsMacOS(navigator.userAgent.toLowerCase().includes('mac'))
  }, [])

  return (

    <>
     <div
        className="w-full h-[45px] bg-black text-white flex items-center justify-end px-4"
        style={{ WebkitAppRegion: 'drag' }}
      >
        {!isMacOS && (
          <div style={{ WebkitAppRegion: 'no-drag' }}>
            <button
              onClick={() => window.api?.minimizeWindow()}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Minimize"
            >
              <CircleMinus className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.api?.closeWindow()}
              className="p-1 mb-0.5 hover:bg-red-800 rounded transition-colors ml-1 mt-1"
              title="Close"
            >
              <RiCloseCircleFill className="w-[22px] h-[22px] " />
            </button>
          </div>
        )}
      </div>
      <div>
        <LoginView />
      </div>
    </>
  )
}

export default AuthPageView
