"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Separator } from "@/components/ui/separator";

export default function DashboardShell({ children, headerContent }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="overflow-x-hidden">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                    <span className="text-sm font-medium text-muted-foreground">Ambox</span>
                    {headerContent && (
                        <div className="flex items-center gap-2 ml-auto">
                            {headerContent}
                        </div>
                    )}
                </header>
                <div className="flex flex-1 flex-col">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
