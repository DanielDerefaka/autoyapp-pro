import React from "react"
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"

const SignInCallback = () => {
    return <AuthenticateWithRedirectCallback />
}

export default SignInCallback
