import SonnerProvider from "./SonnerProvider";
import TanStackDevtoolsProvider from "./TanStackDevtoolsProvider";
import TanstackQueryProvider from "./TanstackQueryProvider";
export { OpenCodeEventProvider } from "./OpenCodeEventProvider";

export function DataProviders({ children }: { children: React.ReactNode }) {
  return (
    <TanstackQueryProvider>
      <>{children}</>
    </TanstackQueryProvider>
  );
}

export function UiProviders({ children }: { children: React.ReactNode }) {
  return (
    <SonnerProvider>
      <TanStackDevtoolsProvider>
        <>{children}</>
      </TanStackDevtoolsProvider>
    </SonnerProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DataProviders>
      <UiProviders>{children}</UiProviders>
    </DataProviders>
  );
}
