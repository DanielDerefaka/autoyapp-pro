import { z } from "zod"

export const SignUpSchema = z.object({
    firstname: z
        .string()
        .min(4, {
            message: "your full name must be atleast 4 characters long",
        }),
    lastname: z
        .string()
        .min(4, {
            message: "your full name must be atleast 4 characters long",
        }),
    email: z.string().email({ message: "Incorrect email format" }),
    password: z
        .string()
        .min(8, { message: "Your password must be atleast 8 characters long" })
        .max(64, {
            message: "Your password can not be longer then 64 characters long",
        })
        .refine(
            (value) => /^[a-zA-Z0-9_.-]*$/.test(value ?? ""),
            "password should contain only alphabets and numbers",
        ),
    confirmPassword: z.string(),
})
