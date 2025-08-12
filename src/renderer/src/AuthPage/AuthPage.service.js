/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
import { useState } from 'react'
import { useSignup, useUserLogin } from './Authpage.query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const AuthPageService = ({ setAuthToken }) => {
  const navigate = useNavigate()
  // const { data: GetUserData,isLoading: isGetUserDataLoading, refetch: refetchUserData } = useGetUser()
  const { mutate: onSignup, isPending: isSignupLoading } = useSignup()
  const { mutate: onUserLogin, isPending: isUserLoginLoading } = useUserLogin()

  const [isLoginPage, setIsLoginPage] = useState(true)

  const handleSignup = (data) => {
    onSignup(
      {
        email: data.email,
        password: data.password,
        name: data.name
      },
      {
        onSuccess: () => {
          navigate('/login')
          toast.success('Account created successfully')
        },
        onError: (error) => {
          console.log(error)
        }
      }
    )
  }

  const handleLogin = (data) => {
    onUserLogin(
      {
        email: data?.email,
        password: data?.password
      },
      {
        onSuccess: (data) => {
          const token = data?.data?.access_token
          if (data && token) {
            if (typeof token === 'string') {
              localStorage.setItem('authToken', token)
              setAuthToken(token)
              console.log(token)
              navigate('/recording-controls')
            }
          }
        },
        onError: (err) => {
          // setLoginError(err?.response?.data?.message || 'Invalid credentials')
          toast.error(err?.response?.data?.message || 'Invalid credentials',{
            position: "bottom-center",
            autoClose: 5000,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
            transition: Bounce,
            })
        }
      }
    )
  }

  return {
    // GetUserData,
    // isGetUserDataLoading,
    // refetchUserData,
    onSignup,
    isSignupLoading,
    isLoginPage,
    setIsLoginPage,
    handleSignup,
    handleLogin,
    isUserLoginLoading
  }
}

export default AuthPageService
