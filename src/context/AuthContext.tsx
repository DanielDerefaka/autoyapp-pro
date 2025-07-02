"use client";
import { onSignUpUser } from "@/actions/auth";
import { SignUpSchema } from "@/app/auth/sign-up/schema";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
} from "./schema";

// Toast helper functions to avoid repetition
const showToast = (
  type: "success" | "error",
  message: string,
  icon: string = type === "success" ? "🔑" : "🚨"
) => {
  toast(type === "success" ? "Success" : "Error", {
    description: message,
    duration: 3000,
    icon,
  });
};

/**
 * Custom hook for handling user sign-in functionality
 */
export const useAuthSignIn = () => {
  const { isLoaded, setActive, signIn } = useSignIn();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    mode: "onBlur",
  });

  // Handle email/password authentication
  const onClerkAuth = async (email: string, password: string) => {
    if (!isLoaded) {
      showToast("error", "Authentication service not loaded");
      return;
    }

    try {
      const authentication = await signIn.create({
        identifier: email,
        password,
      });

      if (authentication.status === "complete") {
        await setActive({ session: authentication.createdSessionId });
        showToast("success", "You are now signed in");
        router.push("/dashboard");
      }
    } catch (error: any) {
      if (error.errorCode === "invalid_credentials") {
        showToast("error", "Invalid credentials");
      } else if (error.errorCode === "form_password_invalid") {
        showToast("error", "Invalid password");
      } else {
        showToast(
          "error",
          error instanceof Error ? error.message : "Authentication failed"
        );
      }
      console.error("Sign-in error:", error);
    }
  };

  // Handle Google OAuth authentication
  const onGoogleAuth = async () => {
    if (!isLoaded) {
      showToast("error", "Authentication service not loaded");
      return;
    }

    try {
      const authentication = await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/callback/sign-in",
        redirectUrlComplete: "/dashboard",
      });
      return authentication;
    } catch (error) {
      showToast("error", "Google authentication failed");
      console.error("Google auth error:", error);
    }
  };

  const { mutate: initiateLoginFlow, isPending } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      onClerkAuth(email, password),
  });

  const { mutate: initiateGoogleLogin, isPending: isGooglePending } =
    useMutation({
      mutationFn: onGoogleAuth,
    });

  const onAuthenticateUser = (values: any) => {
    initiateLoginFlow({ email: values.email, password: values.password });
  };

  return {
    onAuthenticateUser,
    signInWithGoogle: initiateGoogleLogin,
    isPending,
    isGooglePending,
    register,
    errors,
  };
};

export const useAuthSignUp = () => {
  const { isLoaded, setActive, signUp } = useSignUp();
  const router = useRouter();

  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Add this state to store the user data when transitioning to verification
  const [userData, setUserData] = useState({
    email: "",
    firstname: "",
    lastname: "",
  });

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof SignUpSchema>>({
    resolver: zodResolver(SignUpSchema),
    mode: "onBlur",
  });

  // Generate email verification code
  const onGenerateCode = async (email: string, password: string, userData) => {
    if (!isLoaded) {
      showToast("error", "Authentication service not loaded");
      return;
    }

    try {
      setIsLoading(true);
      if (!email || !password) {
        showToast("error", "Invalid email or password");
        return;
      }

      // Store user data for later use
      setUserData({
        email,
        firstname: userData.firstname,
        lastname: userData.lastname,
      });

      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareVerification({ strategy: "email_code" });
      setIsVerifying(true);
      showToast("success", "Verification code sent to your email", "📧");
    } catch (error: any) {
      const errorMessage =
        error.errors?.[0]?.message || "Failed to send verification code";
      showToast("error", errorMessage);
      console.error("Code generation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth sign-up
  const onGoogleSignUp = async () => {
    if (!isLoaded) {
      showToast("error", "Authentication service not loaded");
      return;
    }

    try {
      setIsLoading(true);
      const result = await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/callback/sign-up",
        redirectUrlComplete: "/onboarding",
      });

      console.log("result", result);
      return result;
    } catch (error) {
      showToast("error", "Google signup failed");
      console.error("Google signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete user registration
  const completeRegistration = async () => {
    console.log("Stored user data:", userData); // Check what data we have

    if (!isLoaded) {
      showToast("error", "Authentication service not loaded");
      return;
    }

    if (!code || code.length !== 6) {
      showToast("error", "Please enter a valid 6-digit verification code");
      return;
    }

    try {
      setIsLoading(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status !== "complete") {
        showToast("error", "Invalid verification code");
        return;
      }

      if (!signUp.createdUserId) {
        showToast("error", "User creation failed");
        return;
      }

      const user = await onSignUpUser({
        email: userData.email,
        firstName: userData.firstname,
        lastName: userData.lastname,
        clerkId: signUp.createdUserId,
      });

      if (user.status === "200") {
        showToast("success", "You are now signed up");
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/dashboard");
      } else {
        showToast("error", user.message || "Failed to create user");
      }
    } catch (error: any) {
      showToast("error", "An unexpected error occurred during signup");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onInitiateUserRegistration = completeRegistration;

  const { mutate: signUpWithGoogle, isPending: isGooglePending } = useMutation({
    mutationFn: onGoogleSignUp,
  });

  return {
    onInitiateUserRegistration,
    signUpWithGoogle,
    isVerifying,
    isLoading,
    isGooglePending,
    onGenerateCode,
    setCode,
    code,
    getValues,
    errors,
    register,
    handleSubmit,
    userData,
  };
};

/**
 * Custom hook for handling password reset functionality
 */
export const useForgotPassword = () => {
  const { isLoaded, signIn } = useSignIn();
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [isResetComplete, setIsResetComplete] = useState(false);
  const router = useRouter();

  // Form for email submission
  const {
    register: registerForgotPassword,
    handleSubmit: handleSubmitForgotPassword,
    formState: { errors: forgotPasswordErrors },
    getValues: getForgotPasswordValues,
  } = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  // Form for password reset
  const {
    register: registerResetPassword,
    handleSubmit: handleSubmitResetPassword,
    formState: { errors: resetPasswordErrors },
    getValues: getResetPasswordValues,
  } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
  });

  // Initiate password reset
  const {
    mutate: initiateForgotPasswordFlow,
    isPending: isForgotPasswordPending,
  } = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      if (!isLoaded) {
        throw new Error("Authentication service not loaded");
      }

      const result = await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      return result;
    },
    onSuccess: () => {
      setIsCodeSent(true);
      showToast(
        "success",
        "Password reset instructions sent to your email",
        "📧"
      );
    },
    onError: (error) => {
      showToast("error", "Failed to send reset email");
      console.error("Password reset initiation error:", error);
    },
  });

  // Complete password reset
  const { mutate: resetPassword, isPending: isResetPasswordPending } =
    useMutation({
      mutationFn: async ({
        code,
        newPassword,
      }: {
        code: string;
        newPassword: string;
      }) => {
        if (!isLoaded) {
          throw new Error("Authentication service not loaded");
        }

        const result = await signIn.attemptFirstFactor({
          strategy: "reset_password_email_code",
          code,
          password: newPassword,
        });

        return result;
      },
      onSuccess: () => {
        setIsResetComplete(true);
        showToast("success", "Password reset successfully");
        router.push("/callback/sign-in");
      },
      onError: (error) => {
        showToast(
          "error",
          "Failed to reset password. Please check your code and try again."
        );
        console.error("Password reset completion error:", error);
      },
    });

  // const onForgotPassword = handleSubmitForgotPassword((values) => {
  //   initiateForgotPasswordFlow({ email: values.email })
  // })

  // const onResetPassword = handleSubmitResetPassword((values) => {
  //   resetPassword({ code, newPassword: values.newPassword })
  // })

  const onForgotPassword = handleSubmitForgotPassword((values) => {
    initiateForgotPasswordFlow({ email: values.email });
  });

  const onResetPassword = handleSubmitResetPassword((values) => {
    resetPassword({ code, newPassword: values.newPassword });
  });

  return {
    // Forgot Password
    onForgotPassword,
    registerForgotPassword,
    forgotPasswordErrors,
    isForgotPasswordPending,

    // Reset Password
    onResetPassword,
    registerResetPassword,
    resetPasswordErrors,
    isResetPasswordPending,

    // State
    isCodeSent,
    isResetComplete,
    code,
    setCode,

    // Values
    getForgotPasswordValues,
    getResetPasswordValues,
  };
};
