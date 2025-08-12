/* eslint-disable react-refresh/only-export-components */

import { createContext } from 'react'
import AuthPageService from './AuthPage.service'

export const AuthPageContext = createContext('')

// eslint-disable-next-line react/prop-types
const AuthPageProvider = ({ children, setAuthToken }) => {
  const stateService = AuthPageService({ setAuthToken })

  return <AuthPageContext.Provider value={stateService}>{children}</AuthPageContext.Provider>
}

export default AuthPageProvider
