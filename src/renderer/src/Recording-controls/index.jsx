import RCProvider from './RC.context'
import RCView from './RC.view'

const RCPage = ({ setAuthToken }) => {
  return (
    <RCProvider>
      <RCView setAuthToken={setAuthToken} />
    </RCProvider>
  )
}

export default RCPage
