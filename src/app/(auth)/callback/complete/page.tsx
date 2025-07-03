import React from "react"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { onSignUpUser } from "@/actions/auth"

const CompleteCallback = async () => {
    const user = await currentUser()
    if (!user) {
        redirect("/auth/sign-in")
    }

    const complete = await onSignUpUser({
        firstName: user.firstName as string,
        lastName: user.lastName as string,
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress as string,
    })

    
    if (complete.status === "200") {
        redirect("/dashboard")
    }

    return <div>CompleteCallback</div>
}

export default CompleteCallback
