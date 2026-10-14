'use client'

import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function getSystemTheme(): Theme {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
    // Starts in sync with whatever the inline script in layout.tsx already
    // applied to <html>, so there's no flash/mismatch on mount.
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const current = (document.documentElement.getAttribute('data-theme') as Theme) || getSystemTheme()
        setTheme(current)
        setMounted(true)
    }, [])

    const toggle = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        document.documentElement.setAttribute('data-theme', next)
        try {
            localStorage.setItem('theme', next)
        } catch {
            // localStorage can throw in private browsing — the toggle still
            // works for this page load, it just won't persist.
        }
    }

    // Avoid rendering a possibly-wrong icon before we've read the real theme
    if (!mounted) {
        return <span style={{ width: '38px', height: '38px', display: 'inline-block' }} />
    }

    return (
        <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.18)',
                color: 'white',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
            }}
        >
            {theme === 'dark' ? '🌙' : '🌞'}
        </button>
    )
}