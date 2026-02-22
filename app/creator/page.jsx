"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreatorPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/creator/dashboard");
    }, [router]);

    return null;
}
