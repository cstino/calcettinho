"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  badge?: number
  badgeColor?: string
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  logo?: React.ReactNode
  userComponent?: React.ReactNode
}

export function NavBar({ items, className, logo, userComponent }: NavBarProps) {
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Sincronizza activeTab con l'URL corrente
  useEffect(() => {
    const currentItem = items.find(item => item.url === pathname)
    if (currentItem) {
      setActiveTab(currentItem.name)
    } else {
      // Fallback per la homepage
      if (pathname === "/") {
        setActiveTab("Home")
      }
    }
  }, [pathname, items])

  // Gestione scroll per nascondere/mostrare navbar
  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY < 10) {
        // Sempre visibile in cima alla pagina
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Nasconde quando scrolla verso il basso (dopo 100px)
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Mostra quando scrolla verso l'alto
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', controlNavbar, { passive: true })
    return () => window.removeEventListener('scroll', controlNavbar)
  }, [lastScrollY])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-10 mb-6 sm:pt-6 transition-transform duration-300 ease-in-out",
        // Nasconde/mostra la navbar in base allo scroll
        isVisible ? "translate-y-0" : isMobile ? "translate-y-full" : "-translate-y-full",
        className,
      )}
    >
      <div className="flex items-center gap-3 bg-gray-900/20 border border-gray-600/50 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
        {/* Logo opzionale sul lato sinistro (solo desktop) */}
        {logo && (
          <div className="hidden sm:flex items-center pl-2">
            {logo}
          </div>
        )}
        
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <Link
              key={item.name}
              href={item.url}
              onClick={() => setActiveTab(item.name)}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                // Colori di base per il tema scuro
                "text-gray-200 hover:text-white",
                // Colori quando attivo (invertiti per tema scuro)
                isActive && "text-gray-900 bg-white",
              )}
            >
              <span className="hidden md:inline font-runtime">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              
              {/* Badge di notifica */}
              {item.badge && item.badge > 0 && (
                <div className={cn(
                  "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs font-bold text-white shadow-lg",
                  item.badgeColor || "bg-red-500"
                )}>
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
              
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-white rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-t-full">
                    <div className="absolute w-12 h-6 bg-white/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-white/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-white/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}

        {/* UserComponent sul lato destro (solo desktop) */}
        {userComponent && (
          <div className="hidden sm:flex items-center pr-2">
            {userComponent}
          </div>
        )}
      </div>
    </div>
  )
}
