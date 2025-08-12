import { useContext, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthPageContext } from './AuthPage.context'
import { Loader2 } from 'lucide-react'
import capmeetLogo from '@/assets/capmeetLogo.png'

const LoginView = () => {
  const {  handleLogin, isUserLoginLoading } = useContext(AuthPageContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Login attempt:', { email, password })
    handleLogin({ email, password })
  }

  return (
    <>
      <div className="h-full mt-20 flex items-center justify-center bg-white">
        <div className="w-full max-w-md bg-white rounded-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-2 items-center gap-2">
            <div>
            <img src={capmeetLogo} alt="logo" className="w-12" />
            </div>
            {/* <h1 className='text-2xl font-semibold'>CapMeet</h1> */}
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-[24px] sm:text-[30px]  font-semibold text-gray-900 mb-2">
              Log in to CapMeet
            </h1>
            <p className="text-[14px] sm:text-[16px] text-gray-500">
              Welcome back! Please enter your details.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 text-sm"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 text-sm"
                required
              />
            </div>

            {/* Sign In Button */}
            <Button
              disabled={isUserLoginLoading}
              type="submit"
              className="w-full h-10 bg-black hover:bg-black/75 text-white py-2.5"
            >
              {isUserLoginLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUserLoginLoading ? 'Please wait...' : 'Sign in'}
            </Button>

            {/* Google Sign In */}
            {/* <Button
              type="button"
              variant="outline"
              className="w-full py-2.5 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285f4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34a853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#fbbc05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#ea4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </Button> */}
          </form>

          {/* Sign Up Link */}
          {/* <div className="text-center mt-8">
            <span className="text-sm text-gray-600">Don&apos;t have an account? </span>
            <button
              onClick={() => {
                setIsLoginPage(false)
                navigate('/signup')
              }}
              className="text-sm text-black font-medium"
            >
              Sign up
            </button>
          </div> */}
        </div>
      </div>
    </>
  )
}

export default LoginView
