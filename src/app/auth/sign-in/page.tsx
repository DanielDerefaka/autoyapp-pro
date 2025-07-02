"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validations/auth";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuthSignIn } from "@/context/AuthContext";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { onAuthenticateUser, isPending, errors: authErrors } = useAuthSignIn();

  const onSubmit = async (values: LoginFormValues) => {
    await onAuthenticateUser(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full md:w-[500px] p-8">
        {/* Logo */}
      
        {/* Heading */}
        <h1 className="text-2xl font-medium mb-6">Welcome to FlowBot</h1>
  
        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">Email address</label>
            <input
              type="email"
              placeholder="name@work-email.com"
              className="mt-2 md:w-[450px]  w-full placeholder:text-sm text-sm px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
              {...form.register("email")}
              disabled={isPending}
            />
          </div>
  
          <div className="">
            <label className="text-sm font-medium text-gray-700">Password</label>

            <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="mt-2 w-full  md:w-[450px] placeholder:text-sm text-sm  px-4 py-2 border border-gray-300  focus:outline-none focus:ring-2 focus:ring-black pr-10"
              {...form.register("password")}
              disabled={isPending}
            />
            <button
              type="button"
              className="absolute right-3 top-[55%] transform -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isPending}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          </div>
  
          <div className="flex  w-full  md:w-[450px] items-center justify-between mt-5 text-sm">
            <label className="flex items-center gap-2  mt-3 ">
              <input type="checkbox" className="accent-black" /> Remember Me
            </label>
            <Link href="/forgot-password" className="text-black/50 mt-3 hover:underline">
              Forgot password?
            </Link>
          </div>
  
          <button
            type="submit"
            className="w-full  md:w-[450px] text-sm bg-black cursor-pointer text-white py-2  font-medium hover:bg-black/50 transition-colors"
            disabled={isPending}
          >
            {isPending ? "Signing in..." : "Continue"}
          </button>
        </form>
  
        {/* Divider */}
        {/* <div className="my-6 text-center text-sm text-gray-500">Or continue with</div> */}
  
        {/* OAuth buttons */}
        {/* <div className="flex gap-4">
          <button className="flex-1 border border-gray-300 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100">
            
            Google
          </button>
          <button className="flex-1 border border-gray-300 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.96.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.35-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.76.41-1.26.75-1.55-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.52.11-3.16 0 0 .97-.31 3.18 1.18a10.99 10.99 0 012.9-.39c.99 0 1.99.13 2.9.39 2.2-1.5 3.18-1.18 3.18-1.18.63 1.64.23 2.86.11 3.16.74.81 1.19 1.84 1.19 3.1 0 4.43-2.71 5.41-5.29 5.7.42.37.8 1.1.8 2.22v3.28c0 .31.21.67.8.56A10.51 10.51 0 0023.5 12c0-6.35-5.15-11.5-11.5-11.5z"/>
            </svg>
            GitHub
          </button>
        </div> */}
  
        {/* Sign up link */}
        <div className="mt-6 text-center text-sm text-gray-600">
          Not using FlowBot yet?{" "}
          <Link href="/sign-up" className="text-black ml-3 hover:underline">
            Create an account now
          </Link>
        </div>
      </div>
    </div>
  );
}