import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Github, Shield, Code2, Heart } from 'lucide-react'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">About shcheck-web</h1>
        <p className="text-muted-foreground text-lg">
          A modern web-based security header scanning tool
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            What is shcheck?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            shcheck-web is a security header scanning tool that helps you analyze and improve
            the security headers of your web applications. It provides detailed analysis of
            HTTP security headers, including a comprehensive evaluation of Content-Security-Policy
            based on CSP Level 3 standards.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Technology Stack
          </CardTitle>
          <CardDescription>
            Built with modern web technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Frontend</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">React 18</Badge>
                <Badge variant="secondary">Vite</Badge>
                <Badge variant="secondary">TanStack Router</Badge>
                <Badge variant="secondary">TanStack Query</Badge>
                <Badge variant="secondary">Tailwind CSS</Badge>
                <Badge variant="secondary">shadcn/ui</Badge>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Backend</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">ElysiaJS</Badge>
                <Badge variant="secondary">Drizzle ORM</Badge>
                <Badge variant="secondary">BullMQ</Badge>
                <Badge variant="secondary">PostgreSQL</Badge>
                <Badge variant="secondary">Redis</Badge>
                <Badge variant="secondary">Bun</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Credits
          </CardTitle>
          <CardDescription>
            This project is built upon the excellent work of:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Github className="h-10 w-10 text-muted-foreground" />
            <div className="flex-1">
              <h4 className="font-semibold">shcheck</h4>
              <p className="text-sm text-muted-foreground mb-2">
                The core security header scanning engine by{' '}
                <a
                  href="https://github.com/santoru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  santoru
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
              <a
                href="https://github.com/santoru/shcheck"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                github.com/santoru/shcheck
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">
                <a
                  href="https://github.com/dzulfiikar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  Dzulfikar
                  <ExternalLink className="h-3 w-3" />
                </a>
              </h4>
              <p className="text-sm text-muted-foreground">
                Project development, architecture, and UI/UX design
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-1">Kimi K2.5</h4>
              <p className="text-sm text-muted-foreground">
                Implementation assistance and code generation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>License</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This project is licensed under the MIT License. The original shcheck tool
            is also open source and available under the GNU General Public License v3.0.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
