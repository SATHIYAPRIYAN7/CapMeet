import { useLocation } from 'react-router-dom';

/**
 * Custom hook to get the current route path in an Electron app
 * This replaces window.location.pathname which doesn't work properly in Electron
 * @returns {string} The current route path
 */
export const useCurrentRoute = () => {
  const location = useLocation();
  return location.pathname;
};

/**
 * Utility function to check if we're on a specific route
 * This can be used outside of React components
 * @param {string} routePath - The route path to check
 * @returns {boolean} True if on the specified route
 */
export const isOnRoute = (routePath) => {
  // For Electron apps, we need to check the hash part of the URL
  // since React Router with HashRouter uses hash-based routing
  const currentHash = window.location.hash;
  return currentHash === `#${routePath}`;
};
