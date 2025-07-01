"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"

const ResponsiveDialog = ({ children, ...props }: React.ComponentProps<typeof Dialog> | React.ComponentProps<typeof Drawer>) => {
  const isMobile = useIsMobile();
  const Component = isMobile ? Drawer : Dialog;
  return <Component {...props}>{children}</Component>
}

const ResponsiveDialogTrigger = ({ children, ...props }: React.ComponentProps<typeof DialogTrigger>) => {
  const isMobile = useIsMobile();
  const TriggerComponent = isMobile ? DrawerTrigger : DialogTrigger;
  return <TriggerComponent {...props}>{children}</TriggerComponent>;
};

const ResponsiveDialogContent = ({ children, ...props }: React.ComponentProps<typeof DialogContent>) => {
  const isMobile = useIsMobile();
  const ContentComponent = isMobile ? DrawerContent : DialogContent;
  return <ContentComponent {...props}>{children}</ContentComponent>;
};

const ResponsiveDialogHeader = ({ children, ...props }: React.ComponentProps<typeof DialogHeader>) => {
  const isMobile = useIsMobile();
  const HeaderComponent = isMobile ? DrawerHeader : DialogHeader;
  return <HeaderComponent {...props}>{children}</HeaderComponent>;
};

const ResponsiveDialogFooter = ({ children, ...props }: React.ComponentProps<typeof DialogFooter>) => {
  const isMobile = useIsMobile();
  const FooterComponent = isMobile ? DrawerFooter : DialogFooter;
  return <FooterComponent {...props}>{children}</FooterComponent>;
};

const ResponsiveDialogTitle = ({ children, ...props }: React.ComponentProps<typeof DialogTitle>) => {
  const isMobile = useIsMobile();
  const TitleComponent = isMobile ? DrawerTitle : DialogTitle;
  return <TitleComponent {...props}>{children}</TitleComponent>;
};

const ResponsiveDialogDescription = ({ children, ...props }: React.ComponentProps<typeof DialogDescription>) => {
  const isMobile = useIsMobile();
  const DescriptionComponent = isMobile ? DrawerDescription : DialogDescription;
  return <DescriptionComponent {...props}>{children}</DescriptionComponent>;
};

const ResponsiveDialogClose = ({ children, ...props }: React.ComponentProps<typeof DialogClose>) => {
  const isMobile = useIsMobile();
  const CloseComponent = isMobile ? DrawerClose : DialogClose;
  return <CloseComponent {...props}>{children}</CloseComponent>;
};


export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogClose
}
