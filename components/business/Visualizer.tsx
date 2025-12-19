"use client";

import { useMemo } from 'react';
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseExcel, exportToExcel } from "@/lib/utils/excel";
import { Download, Play, FileText } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Visualizer() {
    const store = useFinanceStore();
    const { t, lang } = useI18n();

    return (
        <div className="flex flex-col gap-4 mt-6">
            <div className="flex gap-4 p-4">
                {/* Netting / Cascade Button */}
                <Button onClick={() => store.runNetting(lang)}>
                    <Play className="mr-2 w-4 h-4" /> {t.runNetting}
                </Button>

                {/* Pooling Button - Needs Target Selection, simplified for now */}
                {/* <Button onClick={() => store.runPooling(target)}>...</Button> */}

                <Button variant="secondary" onClick={() => exportToExcel(store.optimizedDebts, "Optimized_Result")}>
                    <Download className="mr-2 w-4 h-4" /> {t.exportResult}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 h-[600px] p-4">
                <Card className="h-full flex flex-col">
                    <CardHeader><CardTitle>{t.logs}</CardTitle></CardHeader>
                    <CardContent className="flex-1 min-h-0 relative">
                        <div className="absolute inset-0 overflow-auto p-4 text-sm font-mono bg-slate-100 rounded">
                            {store.logs.length === 0 ? <span className="text-slate-400">No logs...</span> :
                                store.logs.map((log, i) => <div key={i} className="mb-2 border-b border-slate-200 pb-1 whitespace-pre-wrap">{log}</div>)
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
