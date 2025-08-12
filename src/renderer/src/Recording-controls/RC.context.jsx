/* eslint-disable react-refresh/only-export-components */

import { createContext } from 'react'
import RCService from './RC.service'

export const RCContext = createContext('')

// eslint-disable-next-line react/prop-types
const RCProvider = ({ children }) => {
  const stateService = RCService()

  return <RCContext.Provider value={stateService}>{children}</RCContext.Provider>
}

export default RCProvider
