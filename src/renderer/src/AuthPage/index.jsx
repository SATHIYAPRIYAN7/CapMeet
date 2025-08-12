import AuthPageProvider from './AuthPage.context'
import AuthPageView from './AuthPage.view'

const AuthPage = ({ setAuthToken }) => {
  return (
    <AuthPageProvider setAuthToken={setAuthToken}>
      <AuthPageView />
    </AuthPageProvider>
  )
}

export default AuthPage
