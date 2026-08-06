import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bug } from "lucide-react";

import { PUBLIC_BRAND_NAME } from "@/lib/brand";

export function PublicLegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-3 font-black tracking-[0.16em]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10">
              <Bug className="h-5 w-5" />
            </span>
            {PUBLIC_BRAND_NAME}
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-white/75 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <div className="mt-8 space-y-6 text-sm leading-7 text-muted-foreground">{children}</div>
      </main>
    </div>
  );
}
