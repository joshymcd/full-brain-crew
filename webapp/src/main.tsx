import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { createOpencodeClient } from '@opencode-ai/sdk/v2/client';


const OPENCODE_SERVER_URL = "https://brain.joshmcd.xyz/";
const OPENCODE_AUTH_HEADER = `Basic ${btoa("opencode:letmein")}`;


const client = createOpencodeClient({
  baseUrl: OPENCODE_SERVER_URL,
  headers: {
    Authorization: OPENCODE_AUTH_HEADER,
  },
});

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  context:{
    opencodeClient: client
  }
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
} 

const rootElement = document.getElementById('app')!

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement) 
  root.render(<RouterProvider router={router} />)
}
