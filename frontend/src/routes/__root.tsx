import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Github, Heart, Shield } from 'lucide-react'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-5 w-5" />
            shcheck-web
          </Link>
          <nav className="flex gap-6">
            <Link to="/" className="[&.active]:font-bold text-sm hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/scans" className="[&.active]:font-bold text-sm hover:text-primary transition-colors">
              Scans
            </Link>
            <Link to="/compare" className="[&.active]:font-bold text-sm hover:text-primary transition-colors">
              Compare
            </Link>
            <Link to="/about" className="[&.active]:font-bold text-sm hover:text-primary transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>
              Powered by{' '}
              <a
                href="https://github.com/santoru/shcheck"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                shcheck
              </a>
              {' '}by santoru
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>UI created by</span>
            <a
              href="https://github.com/dzulfiikar"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Dzulfikar
            </a>
            <span>and</span>
            <span className="font-medium text-foreground">Kimi K2.5</span>
            <Heart className="h-3 w-3 text-red-500 inline" />
          </div>
          <a
            href="https://github.com/santoru/shcheck"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>

      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  ),
})
