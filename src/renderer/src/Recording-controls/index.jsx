import RCProvider from './RC.context'
import RCView from './RC.view'

const RCPage = ({ setAuthToken, setIsMicMuted }) => {
  return (
    <RCProvider>
      <RCView setAuthToken={setAuthToken} setIsMicMuted={setIsMicMuted} />
    </RCProvider>
  )
}

export default RCPage
