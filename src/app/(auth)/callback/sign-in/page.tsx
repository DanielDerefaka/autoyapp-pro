"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

// Create a function to fetch data from an API route instead of using Prisma directly
const fetchUserWorkspaces = async (userId: string) => {
  try {
    // Call your API endpoint instead of Prisma directly
    const response = await fetch(`/api/user-workspaces?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch user workspaces')
    }
    return await response.json()
  } catch (error) {
    console.error("Error fetching user workspaces:", error)
    throw error
  }
}

export default function SignInCallback() {
  const { userId, isLoaded } = useAuth()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Fetch user data and workspaces using TanStack Query
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['userWorkspaces', userId],
    queryFn: () => fetchUserWorkspaces(userId as string),
    enabled: !!userId && isLoaded, // Only run query when userId is available
  })

  useEffect(() => {
    if (!isLoaded || isLoading || isRedirecting) return

    const handleRedirect = async () => {
      try {
        setIsRedirecting(true)

        // Check if user has workspaces
        const hasWorkspaces = userData && (
          userData.workspaces?.length > 0 || 
          userData.ownedWorkspaces?.length > 0
        )

        if (hasWorkspaces) {
          // Redirect to the first workspace
          const firstWorkspace = userData.ownedWorkspaces?.[0] || 
                                userData.workspaces?.[0]?.workspace
          
          if (firstWorkspace) {
            router.push(`/workspace/${firstWorkspace.id}`)
          } else {
            // Fallback to onboarding if something unexpected happens
            router.push("/onboarding")
          }
        } else {
          // No workspaces found, redirect to onboarding
          router.push("/onboarding")
        }
      } catch (error) {
        console.error("Error during redirect:", error)
        // Fallback to dashboard or onboarding on error
        router.push("/onboarding")
      }
    }

    handleRedirect()
  }, [isLoaded, isLoading, userId, userData, router, isRedirecting])

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