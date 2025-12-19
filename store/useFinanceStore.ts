import { create } from 'zustand';
import { Company, Debt, Transaction } from '@/types';

interface FinanceState {
    companies: Company[];
    debts: Debt[];
    optimizedDebts: Transaction[];
    poolingSteps: Transaction[];
    poolingTotal: number;
    finalBalances: Record<string, number>;
    logs: string[];

    addCompany: (company: Company) => void;
    updateCompany: (id: string, data: Partial<Company>) => void;
    removeCompany: (id: string) => void;
    setCompanies: (companies: Company[]) => void;

    addDebt: (debt: Debt) => void;
    removeDebt: (id: string) => void;
    setDebts: (debts: Debt[]) => void;

    runNetting: (lang: 'en' | 'zh') => Promise<void>;
    runPooling: (targetId: string, lang: 'en' | 'zh') => Promise<void>;
    resetOptimizations: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
    companies: [],
    debts: [],
    optimizedDebts: [],
    poolingSteps: [],
    poolingTotal: 0,
    finalBalances: {},
    logs: [],

    addCompany: (company) => set((state) => ({ companies: [...state.companies, company] })),
    updateCompany: (id, data) => set((state) => ({
        companies: state.companies.map((c) => c.id === id ? { ...c, ...data } : c)
    })),
    removeCompany: (id) => set((state) => ({
        companies: state.companies.filter((c) => c.id !== id),
        debts: state.debts.filter(d => d.source !== id && d.target !== id)
    })),
    setCompanies: (companies) => set({ companies }),

    addDebt: (debt) => set((state) => ({ debts: [...state.debts, debt] })),
    removeDebt: (id) => set((state) => ({ debts: state.debts.filter((d) => d.id !== id) })),
    setDebts: (debts) => set({ debts }),

    runNetting: async (lang) => {
        const { companies, debts } = get();
        set({ logs: [lang === 'zh' ? "正在请求计算..." : "Requesting calculation..."] });
        try {
            // 1. Run Basic Netting first (Cycle elimination)
            const resNet = await fetch('/api/netting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companies, debts, lang })
            });
            const dataNet = await resNet.json();

            // 2. Run Cascade Optimization with the netted debts (User Requirement 1)
            // Note: For this prototype we sequence them.
            // We use the OUTPUT of Netting as INPUT for Cascade?
            // Or just run Cascade on raw? Cascade is more powerful.
            // Let's run Cascade directly or chain them.
            // For visual clarity, let's call the 'Pooling' API in 'Cascade' mode to get the Cascade result

            // Calculate Original Total for logging purposes
            const originalTotalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

            const resCascade = await fetch('/api/pooling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companies,
                    debts: dataNet.transactions, // Use NETTED debts to avoid negative cycles in MCMF
                    mode: 'cascade',
                    originalTotalDebt,
                    lang
                })
            });
            const dataCascade = await resCascade.json();

            if ('error' in dataCascade) {
                set({ logs: [...(dataNet.logs || []), `Server Error: ${dataCascade.error}`] });
                return;
            }

            set({
                optimizedDebts: dataCascade.transactions || [],
                logs: [...(dataNet.logs || []), ...(dataCascade.logs || [])],
                finalBalances: dataCascade.finalBalances || {}
            });

        } catch (e) {
            set({ logs: [`Error: ${String(e)}`] });
        }
    },

    runPooling: async (targetId, lang) => {
        const { companies, debts } = get();
        // TODO: Implement similar fetch for Pooling mode
        console.log("Pooling not fully wired in UI yet");
    },

    resetOptimizations: () => set({ optimizedDebts: [], poolingSteps: [], poolingTotal: 0, finalBalances: {}, logs: [] }),
}));
