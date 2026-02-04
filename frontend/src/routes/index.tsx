import { createFileRoute } from '@tanstack/react-router'
import { ScanForm } from '@/components/scan-form'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="container mx-auto py-8 px-4" data-testid="home-page">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="home-title">Security Header Checker</h1>
        <p className="mt-2 text-muted-foreground" data-testid="home-description">
          Scan and analyze security headers of any website
        </p>
      </div>
      <div className="flex justify-center">
        <ScanForm />
      </div>
    </div>
  )
}
