'use client';

import React from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useForgotPassword } from "@/context/AuthContext";
import { toast } from "sonner";

const OtpInput = dynamic(
  () => import("@/components/otp").then((component) => component.default),
  { ssr: false }
);

const ForgotPasswordForm = () => {
  const {
    onForgotPassword,
    registerForgotPassword,
    forgotPasswordErrors,
    isForgotPasswordPending,
    onResetPassword,
    registerResetPassword,
    resetPasswordErrors,
    isResetPasswordPending,
    isCodeSent,
    isResetComplete,
    code,
    setCode,
    getResetPasswordValues,
  } = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodeSent) {
      if (!code || code.length !== 6) {
        console.error("Invalid OTP code");
        return;
      }
      
      const { newPassword, confirmPassword } = getResetPasswordValues();
      if (newPassword !== confirmPassword) {
        toast("Passwords do not match");
        return;
      }
      
      onResetPassword();
    } else {
      onForgotPassword();
    }
  };

  if (isResetComplete) {
    return (
      <div className="w-full text-center">
        <div className="mb-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-black mb-2">Password reset successful</h1>
          <p className="text-gray-600 text-sm">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
        </div>
        <Link 
          href="/sign-in"
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors inline-block"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-black mb-2">
          {isCodeSent ? "Reset password" : "Forgot password"}
        </h1>
        <p className="text-gray-600 text-sm">
          {isCodeSent 
            ? "Enter the verification code and choose a new password" 
            : "Enter your email address and we'll send you a reset code"}
        </p>
      </div>

      {/* Error Messages */}
      {forgotPasswordErrors?.root && !isCodeSent && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{forgotPasswordErrors.root.message}</p>
        </div>
      )}

      {resetPasswordErrors?.root && isCodeSent && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{resetPasswordErrors.root.message}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isCodeSent ? (
          // Reset Password Form
          <>
            <div className="flex justify-center mb-6">
              <OtpInput otp={code} setOtp={setCode} />
            </div>
            {resetPasswordErrors?.root && (
              <p className="text-red-500 text-xs text-center">
                {resetPasswordErrors.root.message}
              </p>
            )}

            <div>
              <input
                type="password"
                placeholder="New password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
                {...registerResetPassword("newPassword")}
              />
              {resetPasswordErrors?.newPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {resetPasswordErrors.newPassword.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Must include uppercase, lowercase, and number.
              </p>
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
                {...registerResetPassword("confirmPassword")}
              />
              {resetPasswordErrors?.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">
                  {resetPasswordErrors.confirmPassword.message}
                </p>
              )}
            </div>
          </>
        ) : (
          // Forgot Password Form
          <div>
            <input
              type="email"
              placeholder="Email address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
              {...registerForgotPassword("email")}
            />
            {forgotPasswordErrors?.email && (
              <p className="text-red-500 text-xs mt-1">
                {forgotPasswordErrors.email.message}
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isCodeSent ? isResetPasswordPending : isForgotPasswordPending}
        >
          {isCodeSent 
            ? (isResetPasswordPending ? "Resetting..." : "Reset Password")
            : (isForgotPasswordPending ? "Sending Reset Code..." : "Send Reset Code")}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <Link href="/sign-in" className="text-sm text-gray-600 hover:text-black transition-colors">
          Back to sign in
        </Link>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;