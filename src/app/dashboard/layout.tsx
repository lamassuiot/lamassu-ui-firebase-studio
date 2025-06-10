
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Shield, FileText, Users, Landmark, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard/certificates', label: 'Certificates', icon: FileText },
    { href: '/dashboard/certificate-authorities', label: 'Certificate Authorities', icon: Landmark },
    { href: '/dashboard/registration-authorities', label: 'Registration Authorities', icon: Users },
    { href: '/dashboard/verification-authorities', label: 'Verification Authorities', icon: ShieldCheck },
  ];

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar collapsible="icon" className="border-r bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Shield className="h-8 w-8 text-primary flex-shrink-0" />
              <h2 className="font-headline text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden whitespace-nowrap">
                LamassuIoT
              </h2>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')} // More robust active check
                    tooltip={{children: item.label, side: 'right', align: 'center' }}
                  >
                    <Link href={item.href} className="flex items-center w-full justify-start">
                      <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden whitespace-nowrap">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 mt-auto border-t border-sidebar-border">
             <div className="group-data-[collapsible=icon]:hidden w-full">
                <ThemeToggle />
             </div>
             <div className="hidden group-data-[collapsible=icon]:flex justify-center w-full">
                <ThemeToggle />
             </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background shadow-lg px-4 md:px-6">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <div className="flex-1 text-left">
              <h1 className="text-xl font-semibold ml-2 md:ml-0">
                {navItems.find(item => pathname.startsWith(item.href))?.label || 'Dashboard'}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
