import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { useOpencodeRouterContext } from './opencode-client'

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context: undefined!,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
} 

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement) 
  root.render(<App />)
}

function App() {
  const routerContext = useOpencodeRouterContext()

  return <RouterProvider router={router} context={routerContext} />
}
