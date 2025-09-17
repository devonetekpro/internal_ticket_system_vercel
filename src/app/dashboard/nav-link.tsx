
'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

export default function NavLink({ href, label, children, isDisabled = false, className, exact = false }: { href: string, label:string, children: React.ReactNode, isDisabled?: boolean, className?: string, exact?: boolean }) {
    const pathname = usePathname()
    const isActive = exact ? pathname === href : pathname.startsWith(href)

    const linkClasses = cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        isActive && "text-primary bg-muted",
        isDisabled && "cursor-not-allowed opacity-50",
        className
    )

    if (isDisabled) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <div className={linkClasses}>
                            {children}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{label} (Coming Soon)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <Link href={href} className={linkClasses}>
            {children}
        </Link>
    )
}
