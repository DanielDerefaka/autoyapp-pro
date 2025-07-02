"use server";

import { prisma } from "@/lib/prisma";

export const onSignUpUser = async (data: {
    email: string
    firstName: string
    lastName: string
    clerkId: string
    imageUrl?: string;
}) => {
    try {
        console.log(data)
        if (!data.email || !data.firstName || !data.lastName || !data.clerkId)
            return {
                status: "400",
                message: "Invalid data",
            }

        // Check if user already exists first
        const existingUser = await prisma.user.findUnique({
            where: {
                clerkId: data.clerkId,
            },
        });

        if (existingUser) {
            return {
                status: "200",
                message: "User already exists",
                user: existingUser,
            };
        }

        const user = await prisma.user.create({
            data: {
                id: data.clerkId,
                clerkId: data.clerkId,
                email: data.email.toLowerCase(),
                name: `${data.firstName} ${data.lastName}`,
            },
        })

        if (user) {
            return {
                status: "200",
                message: "User created successfully",
                user,
            }
        }
        return {
            status: "400",
            message: "User not created",
        }
    } catch (error: any) {
        console.log(error)
        
        // Handle unique constraint errors
        if (error.code === 'P2002') {
            return {
                status: "200",
                message: "User already exists",
            }
        }
        
        return {
            status: "500",
            message: "Internal server error",
        }
    }
}

export const updateUserProfile = async (
    clerkId: string,
    data: {
        name?: string;
        avatar?: string;
        timezone?: string;
    }
) => {
    try {
        const user = await prisma.user.update({
            where: { clerkId },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.avatar && { avatar: data.avatar }),
                ...(data.timezone && { timezone: data.timezone }),
            },
        });

        return {
            status: 200,
            message: "Profile updated successfully",
            user,
        };
    } catch (error) {
        console.error("Error updating user profile:", error);
        return {
            status: 500,
            message: "Failed to update profile",
            user: null,
        };
    }
};

