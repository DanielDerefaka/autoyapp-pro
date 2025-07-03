"use client"

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export default function AuthLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="absolute mt-5 p-10">
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-gray-600  hover:text-black transition-colors"
        >
        <Image src="/logosm.png" alt="flowbot" className='w-full h-10' width={100} height={100} />
        <span className="text-2xl font-bold  gap-5  ml-3">FLOWBOT</span>
         </Link>
      </div>
      
  
      {/* Main Content */}
      <div className="flex items-center justify-center ">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
