"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
    const { lang, setLang } = useI18n();
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
            className="fixed top-4 right-4 z-50"
        >
            {lang === 'en' ? '中文' : 'English'}
        </Button>
    );
}
