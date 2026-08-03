import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { CaretakerGame } from "@/components/windoors/caretaker-game";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="h-[calc(100dvh-var(--grok-banner-h,0px))] overflow-hidden">
      <ClientOnly
        fallback={
          <div className="desktop-wallpaper flex h-full items-center justify-center">
            <p className="text-sm text-white/70">Starting Windoors 11.3…</p>
          </div>
        }
      >
        <CaretakerGame />
      </ClientOnly>
    </main>
  );
}
