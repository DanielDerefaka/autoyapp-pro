"use client"

import { useState } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useAuthSignUp } from "@/context/AuthContext"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import dynamic from "next/dynamic"

const OtpInput = dynamic(
  () => import("@/components/otp").then((component) => component.default),
  { ssr: false },
)

const formSchema = z.object({
  firstname: z.string().min(2, "First name is required"),
  lastname: z.string().min(2, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
})

type FormValues = z.infer<typeof formSchema>

const SignUpForm = () => {
  const [showPassword, setShowPassword] = useState(false)
  
  const { 
    isVerifying, 
    isLoading, 
    onGenerateCode,
    code,
    setCode,
    onInitiateUserRegistration
  } = useAuthSignUp()
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      password: ""
    }
  })

  const handleGenerateCode = (data: FormValues) => {
    onGenerateCode(data.email, data.password, {
      firstname: data.firstname,
      lastname: data.lastname
    })
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onInitiateUserRegistration()
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-white'>

<div className="w-full md:w-[500px] p-8">
      {/* Header */}
      <div className="text-start mb-8">
        <h1 className="text-2xl font-semibold text-black mb-2">
          {isVerifying ? "Verify email" : "Create account"}
        </h1>
        <p className="text-gray-600 text-sm">
          {isVerifying 
            ? `Enter the code sent to ${form.getValues("email")}`
            : "Get started with FlowBot AI"
          }
        </p>
      </div>
      
      {isVerifying ? (
        /* Verification Form */
        <form onSubmit={handleOtpSubmit} className="space-y-6">
          <div className="flex justify-center">
            <OtpInput otp={code} setOtp={setCode} />
          </div>
          
          <button
            type="submit"
            className="w-full bg-black   text-white py-3  font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Verify & Create Account'}
          </button>
        </form>
      ) : (
        /* Sign Up Form */
        <form onSubmit={form.handleSubmit(handleGenerateCode)} className="space-y-4">
          <div className="grid grid-cols-2 md:w-[450px] w-full gap-4">
            <div>
            <label className="text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                placeholder="First name"
                className=" w-full px-4 py-2 border placeholder:text-sm text-sm border-gray-300  focus:outline-none focus:border-black transition-colors"
                {...form.register('firstname')}
                disabled={isLoading}
              />
              {form.formState.errors.firstname && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.firstname.message}</p>
              )}
            </div>
            
            <div>
            <label className="text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                placeholder="Last name"
                className=" w-full px-4 py-2 border border-gray-300 placeholder:text-sm text-sm  focus:outline-none focus:border-black transition-colors"
                {...form.register('lastname')}
                disabled={isLoading}
              />
              {form.formState.errors.lastname && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.lastname.message}</p>
              )}
            </div>
          </div>
          
          <div>
          <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              placeholder="Email"
              className="md:w-[450px]  w-full px-4 py-2 border border-gray-300 placeholder:text-sm text-sm focus:outline-none focus:border-black transition-colors"
              {...form.register('email')}
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          <div className="">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="md:w-[450px]  w-full px-4 py-2 border placeholder:text-sm text-sm border-gray-300  focus:outline-none focus:border-black transition-colors pr-12"
              {...form.register('password')}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {form.formState.errors.password && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
          </div>

          <button
            type="submit"
            className="md:w-[450px]  w-full bg-black text-sm text-white py-3  font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      )}
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-black font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </div>
  )
}

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

export default SignUpForm