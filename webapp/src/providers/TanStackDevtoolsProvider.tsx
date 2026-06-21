import { TanStackDevtools } from '@tanstack/react-devtools'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools' 
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

function TanStackDevtoolsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {import.meta.env.DEV && (
        <TanStackDevtools
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
            // {
            //   name: 'Tanstack Pacer',
            //   // @ts-expect-error
            //   render: <PacerDevtoolsPanel />,
            // },
            // {
            //   name: 'Tanstack Query',
            //   render: <ReactQueryDevtoolsPanel />,
            // },
          ]}
        />
      )}
    </>
  )
}

export default TanStackDevtoolsProvider