import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 100 * 60 * 60 * 24, // 1 day
//       gcTime: Infinity,
//     },
//   },
})

function TanstackQueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default TanstackQueryProvider