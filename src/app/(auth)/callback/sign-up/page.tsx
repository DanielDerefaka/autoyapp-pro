"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SignUpCallback() {
  const { isLoaded } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (!isLoaded || isRedirecting) return

    const handleRedirect = async () => {
      try {
        setIsRedirecting(true)
        // Always redirect to onboarding for new sign-ups
        router.push("/onboarding")
      } catch (error) {
        console.error("Error during redirect:", error)
        router.push("/onboarding")
      }
    }

    handleRedirect()
  }, [isLoaded, router, isRedirecting])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setting up your account</h1>
        <p className="text-gray-600">Please wait while we prepare your workspace...</p>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </div>
    </div>
  )
}