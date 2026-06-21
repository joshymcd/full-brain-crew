import { Toaster } from '@/components/ui/sonner'

function SonnerProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <>{children}</>
      <Toaster />
    </>
  )
}

export default SonnerProvider