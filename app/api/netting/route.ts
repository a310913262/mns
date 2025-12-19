import { NextResponse } from 'next/server';
import { Company, Debt, Transaction } from "@/types";

// Cloudflare Pages runs on the Edge runtime; ensure this route is compatible.
export const runtime = "edge";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { companies, debts, lang = 'zh' } = body as { companies: Company[]; debts: Debt[]; lang?: 'en' | 'zh' };

        // Algorithm Logics
        const { transactions, logs } = calculateNetting(companies, debts, lang);

        return NextResponse.json({ transactions, logs });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function calculateNetting(companies: Company[], debts: Debt[], lang: 'en' | 'zh'): { transactions: Transaction[], logs: string[] } {
    const nameMap: Record<string, string> = {};
    companies.forEach(c => nameMap[c.id] = c.name);

    let currentDebts = debts.map(d => ({ ...d }));
    const logs: string[] = [];
    let hasCycle = true;
    let cycleCount = 0;
    const totalOffset: Record<string, number> = {};

    const t = {
        en: { foundCycle: "Found cycle", minAmount: "Min amount", executing: "Executing offset", complete: "Optimization complete. Reduced from" },
        zh: { foundCycle: "发现环路", minAmount: "最小权值", executing: "执行抵销", complete: "优化完成。债务笔数从" }
    }[lang];

    while (hasCycle) {
        hasCycle = false;
        const adj: Record<string, { target: string; amount: number; index: number }[]> = {};

        // Build Graph
        currentDebts.forEach((d, idx) => {
            if (d.amount <= 1e-6) return;
            if (!adj[d.source]) adj[d.source] = [];
            adj[d.source].push({ target: d.target, amount: d.amount, index: idx });
        });

        const visited: Set<string> = new Set();
        const recursionStack: Set<string> = new Set();
        const path: { source: string; edgeIndex: number }[] = [];

        const findCycle = (node: string): boolean => {
            if (recursionStack.has(node)) return true;
            if (visited.has(node)) return false;

            visited.add(node);
            recursionStack.add(node);

            const outgoing = adj[node] || [];
            for (const edge of outgoing) {
                path.push({ source: node, edgeIndex: edge.index });
                if (findCycle(edge.target)) return true;
                path.pop();
            }

            recursionStack.delete(node);
            return false;
        };

        for (const company of companies) {
            // Clear path reuse for each component check if needed, 
            // but simplistic DFS is okay if we reset/handle carefully.
            // Easiest is to try finding cycle from fresh unvisited
            if (!visited.has(company.id)) {
                if (findCycle(company.id)) {
                    hasCycle = true;
                    break;
                }
            }
        }

        if (hasCycle) {
            // Backtrack to find the actual cycle in the path
            const lastEdge = path[path.length - 1];
            const targetOfLast = currentDebts[lastEdge.edgeIndex].target;
            const startIdx = path.findIndex(p => p.source === targetOfLast);

            if (startIdx !== -1) {
                const cyclePath = path.slice(startIdx);
                // Calculate min
                let minAmount = Infinity;
                const cycleNames: string[] = [];

                cyclePath.forEach(p => {
                    const d = currentDebts[p.edgeIndex];
                    if (d.amount < minAmount) minAmount = d.amount;
                    cycleNames.push(nameMap[d.source] || d.source);
                });
                const lastTarget = currentDebts[cyclePath[cyclePath.length - 1].edgeIndex].target;
                cycleNames.push(nameMap[lastTarget] || lastTarget);

                const logMsg = lang === 'zh'
                    ? `[环路 #${++cycleCount}] ${t.foundCycle}: ${cycleNames.join(' -> ')}。${t.minAmount}: ${minAmount}。`
                    : `[Cycle #${++cycleCount}] ${t.foundCycle}: ${cycleNames.join(' -> ')}. ${t.minAmount}: ${minAmount}.`;

                logs.push(logMsg);
                logs.push(lang === 'zh' ? `  > 执行抵销细节:` : `  > Execution Details:`);

                // Execute reduction
                cyclePath.forEach((p, i) => {
                    const d = currentDebts[p.edgeIndex];
                    d.amount -= minAmount;

                    // Track offset
                    totalOffset[d.source] = (totalOffset[d.source] || 0) + minAmount;

                    const srcName = nameMap[d.source] || d.source;
                    const tgtName = nameMap[d.target] || d.target;

                    logs.push(lang === 'zh'
                        ? `    [步骤 ${i + 1}] ${srcName} -> ${tgtName}: 抵销 ${minAmount} 万`
                        : `    [Step ${i + 1}] ${srcName} -> ${tgtName}: Offset ${minAmount}`);
                });

                currentDebts = currentDebts.filter(d => d.amount > 1e-6);
            } else {
                hasCycle = false; // Should not happen
            }
        }
    }

    // Final Aggregation
    const combinedDebts: Record<string, number> = {};
    currentDebts.forEach(d => {
        const key = `${d.source} -> ${d.target} `;
        combinedDebts[key] = (combinedDebts[key] || 0) + d.amount;
    });

    const transactions: Transaction[] = Object.entries(combinedDebts).map(([key, amount]) => {
        const [source, target] = key.split('->').map(s => s.trim());
        return {
            id: Math.random().toString(36).substr(2, 9),
            source,
            target,
            amount
        };
    });

    const finalCount = transactions.length;
    logs.push(lang === 'zh'
        ? `${t.complete} ${debts.length} 降至 ${finalCount}。`
        : `${t.complete} ${debts.length} to ${finalCount} debts.`);

    // Append Per-Company Offset Summary
    const companiesInvolved = Object.keys(totalOffset);
    if (companiesInvolved.length > 0) {
        logs.push(lang === 'zh' ? "--- 抵销执行明细 ---" : "--- Netting Execution Summary ---");
        companiesInvolved.forEach(c => {
            const amount = totalOffset[c];
            logs.push(lang === 'zh'
                ? `${c}: 抵销债务 ${amount} 万`
                : `${c}: Offset Debt ${amount}`);
        });
        logs.push("--------------------------------");
    }



    return { transactions, logs };
}
