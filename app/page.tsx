"use client";

import { InputPanel } from "@/components/business/InputPanel";
import { Visualizer } from "@/components/business/Visualizer";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/business/LanguageSwitcher";

function MainContent() {
  const { t } = useI18n();
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {t.appTitle}
        </h1>
        <p className="text-slate-500">
          {t.appDesc}
        </p>
      </div>

      <InputPanel />
      <Visualizer />
    </div>
  );
}

export default function Home() {
  return (
    <I18nProvider>
      <main className="min-h-screen bg-slate-50 p-8">
        <LanguageSwitcher />
        <MainContent />
      </main>
    </I18nProvider>
  );
}
