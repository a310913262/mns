import { NextResponse } from 'next/server';
import { Company, Debt, Transaction } from "@/types";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { companies, debts, targetId, mode, originalTotalDebt, lang = 'zh' } = body as {
            companies: Company[];
            debts: Debt[];
            targetId?: string;
            mode: 'pooling' | 'cascade';
            originalTotalDebt?: number;
            lang?: 'en' | 'zh';
        };

        if (mode === 'cascade') {
            const result = calculateCascadeMCMF(companies, debts, lang, originalTotalDebt);
            return NextResponse.json(result);
        } else {
            // Placeholder for Pooling if needed, or reuse MCMF with different costs
            const result = calculatePooling(companies, debts, targetId || '', lang);
            return NextResponse.json(result);
        }

    } catch (err) {
        console.error("Pooling API Error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}

// ------------------------------------------------------------------
// Algorithm: Min-Cost Max-Flow (MCMF) for Debt Cascade
// Objective: Use limited cash (Source) to maximize debt reduction.
// Modeling:
//   - Nodes: Source (S), Sink (T), and one node per Company.
//   - Edges:
//     1. S -> Company (if balance > 0): Cap = Balance, Cost = 0.
//     2. Company A -> Company B (if Debt A->B): Cap = Debt Amount, Cost = -1 (Profit 1).
//     3. Company -> T: Cap = Infinity, Cost = 0.
//   - Algorithm: Successive Shortest Path using SPFA (or Dijkstra with Potentials).
//     Since graph is small and weights are simple (-1), SPFA is sufficient and efficient.
// ------------------------------------------------------------------

function calculateCascadeMCMF(companies: Company[], debts: Debt[], lang: 'en' | 'zh', originalTotalDebt?: number) {
    const nameMap: Record<string, string> = {};
    companies.forEach(c => nameMap[c.id] = c.name);

    const logs: string[] = [];
    const t = {
        en: { start: "Starting Max-Debt-Reduction Flow (MCMF)...", flow: "Cash Flow", profit: "Total Debt Reduced" },
        zh: { start: "开始执行最大化消债算法 (MCMF)...", flow: "资金流转", profit: "总消除债务" }
    }[lang];

    logs.push(t.start);

    // If originalTotalDebt is passed (from Netting context), use it. Otherwise calculate from current debts.
    // However, for "Initial Total Debt" in the log, we probably want the snapshot BEFORE cascade, 
    // but the user wants the GLOBAL initial debt (before Netting).
    // Let's rely on the passed parameter if checking "Global" reduction.

    // Actually, calculateCascadeMCMF reduces 'debts' passed to it.
    // If we want to show "Global Initial -> Global Final", we need the Global Initial.

    const currentDebtSum = debts.reduce((sum, d) => sum + d.amount, 0);
    const displayInitialDebt = originalTotalDebt !== undefined ? originalTotalDebt : currentDebtSum;

    const totalCash = companies.reduce((sum, c) => sum + c.balance, 0);

    logs.push(lang === 'zh'
        ? `初始总债务: ${displayInitialDebt} 万 (其中级联处理: ${currentDebtSum} 万)。可用资金池: ${totalCash} 万`
        : `Initial Total Debt: ${displayInitialDebt} (Cascade processing: ${currentDebtSum}). Available Cash: ${totalCash}`);

    // 1. Graph Construction
    const S = 'SOURCE_SUPER';
    const T = 'SINK_SUPER';
    const nodeMap = new Map<string, number>();
    const revNodeMap = new Map<number, string>();
    let nodeIdCounter = 0;

    const getNodeId = (id: string) => {
        if (!nodeMap.has(id)) {
            nodeMap.set(id, nodeIdCounter);
            revNodeMap.set(nodeIdCounter, id);
            nodeIdCounter++;
        }
        return nodeMap.get(id)!;
    };

    getNodeId(S);
    getNodeId(T);
    companies.forEach(c => getNodeId(c.id));
    debts.forEach(d => {
        getNodeId(d.source);
        getNodeId(d.target);
    });

    const numNodes = nodeIdCounter;

    // Edge Structure
    interface Edge {
        to: number;
        capacity: number;
        flow: number;
        cost: number;
        rev: number; // index of reverse edge
        isDebt: boolean;
        originalDebtId?: string;
    }

    const adj: Edge[][] = Array(numNodes).fill(0).map(() => []);

    const addEdge = (u: number, v: number, cap: number, cost: number, isDebt: boolean, debtId?: string) => {
        adj[u].push({ to: v, capacity: cap, flow: 0, cost, rev: adj[v].length, isDebt, originalDebtId: debtId });
        adj[v].push({ to: u, capacity: 0, flow: 0, cost: -cost, rev: adj[u].length - 1, isDebt: false });
    };

    // Add Edges
    // 1. S -> Company
    companies.forEach(c => {
        if (c.balance > 0) {
            addEdge(getNodeId(S), getNodeId(c.id), c.balance, 0, false);
        }
        // 3. Company -> T (Allow unused funds to just limit at T? Or just flow through?)
        // Actually, for "Debt Reduction", flow only produces value on Debt Edges.
        // We need flow to reach T to complete a valid flow path in Max-Flow formulation?
        // Or can it stop anywhere?
        // In standard Max-Flow, flow MUST reach T.
        // So we allow any company to send to T.
        addEdge(getNodeId(c.id), getNodeId(T), Infinity, 0, false);
    });

    // 2. Debt Edges
    debts.forEach(d => {
        addEdge(getNodeId(d.source), getNodeId(d.target), d.amount, -1, true, d.id);
    });

    // DIAGNOSTIC LOGGING
    const cashNodes = companies.filter(c => c.balance > 0);
    if (cashNodes.length > 0 && currentDebtSum > 0) {
        logs.push(lang === 'zh' ? "--- 资金节点连通性检查 ---" : "--- Cash Node Connectivity Check ---");
        let connectedCash = 0;
        cashNodes.forEach(c => {
            const u = getNodeId(c.id);
            // Check if this node has outgoing debt edges (cost = -1)
            const hasDebt = adj[u].some(e => e.isDebt);
            const cName = nameMap[c.id] || c.id;
            if (hasDebt) {
                connectedCash++;
                logs.push(lang === 'zh'
                    ? `[OK] ${cName} (余额: ${c.balance}) -> 发现债务，可用于级联。`
                    : `[OK] ${cName} (Bal: ${c.balance}) -> Debt found, can cascade.`);
            } else {
                logs.push(lang === 'zh'
                    ? `[警告] ${cName} (余额: ${c.balance}) -> 无对外债务，资金无法流出。请检查名称是否匹配或是否有债务。`
                    : `[Warning] ${cName} (Bal: ${c.balance}) -> No outgoing debts. Cash trapped.`);
            }
        });
        if (connectedCash === 0) {
            logs.push(lang === 'zh' ? "结论: 所有持资公司均无对外债务，无法启动级联。" : "Conclusion: No company with cash has debts. Cascade failed.");
        }
        logs.push("--------------------------------");
    }

    // 2. Run MCMF (SPFA)
    let totalFlow = 0;
    let minCost = 0;
    let loopSafety = 0;

    // For logging decomposition
    const flowsActuallyUsed: { u: string, v: string, amount: number, debtId?: string }[] = [];

    while (loopSafety++ < 1000) {
        const dist = Array(numNodes).fill(Infinity);
        const parentNode = Array(numNodes).fill(-1);
        const parentEdge = Array(numNodes).fill(-1);
        const inQueue = Array(numNodes).fill(false);
        const queue: number[] = [];

        const srcIdx = getNodeId(S);
        const snkIdx = getNodeId(T);

        dist[srcIdx] = 0;
        queue.push(srcIdx);
        inQueue[srcIdx] = true;

        // Safety break for negative cycles (if any slipped through)
        if (queue.length > numNodes * numNodes * 2) {
            logs.push(lang === 'zh' ? "检测到可能的负权环，停止优化以防止死循环。" : "Negative cycle detected, stopping to prevent infinite loop.");
            break;
        }

        while (queue.length > 0) {
            const u = queue.shift()!;
            inQueue[u] = false;

            // Safety check 2
            if (dist[u] < -1e9) continue; // Bound check

            for (let i = 0; i < adj[u].length; i++) {
                const e = adj[u][i];
                if (e.capacity > e.flow && dist[e.to] > dist[u] + e.cost) {
                    dist[e.to] = dist[u] + e.cost;
                    parentNode[e.to] = u;
                    parentEdge[e.to] = i;
                    if (!inQueue[e.to]) {
                        queue.push(e.to);
                        inQueue[e.to] = true;
                    }
                }
            }
        }

        if (dist[snkIdx] === Infinity) break; // No more path to Sink
        // Important: In MCMF for specific profit, we only augment if Cost < 0 (i.e., Profit > 0).
        // Since we defined T edges as cost 0, any path with net negative cost is good.
        // If the shortest path has positive cost (meaning we are forced to pay?), we stop?
        // Here, cost is -1 per debt. 
        // S->A->B->T cost = -1. S->A->T cost = 0.
        // SPFA will prefer S->A->B->T.
        // If dist[T] >= 0, it means no more debt reduction is possible (only 0 cost paths left).
        if (dist[snkIdx] >= 0) break;

        let push = Infinity;
        let curr = snkIdx;
        while (curr !== srcIdx) {
            const p = parentNode[curr];
            const idx = parentEdge[curr];
            push = Math.min(push, adj[p][idx].capacity - adj[p][idx].flow);
            curr = p;
        }

        curr = snkIdx;
        const pathNodeIds: string[] = []; // For logging
        while (curr !== srcIdx) {
            const p = parentNode[curr];
            const idx = parentEdge[curr];
            adj[p][idx].flow += push;
            const revIdx = adj[p][idx].rev;
            adj[curr][revIdx].flow -= push;

            // Record if it's a debt edge for final output
            if (adj[p][idx].isDebt) {
                // We will reconstruct full logs later from final state, or log increments now.
                // Let's log increments for transparency of algorithm steps?
                // Usually final state is better. But "Steps" are requested on UI.
            }
            if (curr !== snkIdx && p !== srcIdx) {
                // pathNodeIds.push(revNodeMap.get(curr)!);
            }

            minCost += push * adj[p][idx].cost;
            curr = p;
        }
        totalFlow += push;
    }

    // 3. Reconstruct Transactions & Logs from Flow State
    const transactions: Transaction[] = [];

    // Detailed Step-by-Step Balance Tracking
    const simulatedBalances: Record<string, number> = {};
    companies.forEach(c => simulatedBalances[c.id] = c.balance);
    let stepCount = 0;

    // We examine all Debt Edges with flow > 0
    // To make logs coherent (A->B->C), we might need to decompose flow.
    // Simple approach: Just list all payments.
    // Better approach: Trace flow chains from S. (Flow Decomposition)

    // Copy flow state for decomposition
    const tempAdj = adj.map(edges => edges.map(e => ({ ...e })));

    const decomposeDFS = (u: number, flowNeeded: number, path: string[]) => {
        if (u === getNodeId(T)) {
            // Reached sink.
            const sourceCompanyId = path[0];
            const chainIds = path.slice(0, path.length);
            // Chain is [C1, C2, ..., Cn]. u is T.
            // Flow moves S -> C1(uses cash) -> C2 -> ... -> Cn -> T(keeps cash).

            // Format: A -> B -> C (using names)
            const actualChainNames = chainIds.map(id => nameMap[id] || id);
            const debtEdgesCount = Math.max(0, actualChainNames.length - 1);
            const reduced = debtEdgesCount * flowNeeded;

            if (debtEdgesCount > 0) {
                // Log the overall chain first
                const logStr = lang === 'zh'
                    ? `[${t.flow}] ${actualChainNames.join(' -> ')}: ${flowNeeded} 万. (${t.profit}: ${reduced} 万)`
                    : `[${t.flow}] ${actualChainNames.join(' -> ')}: ${flowNeeded}. (${t.profit}: ${reduced})`;
                logs.push(logStr);

                // Log Granular Steps
                logs.push(lang === 'zh' ? `  > 执行路径明细:` : `  > Execution Steps:`);

                // Step 0: Source Injection (S->C1)
                // This is implicit in the "Balance" usage.
                const startCompId = chainIds[0];
                const startCompName = nameMap[startCompId] || startCompId;
                simulatedBalances[startCompId] -= flowNeeded;
                logs.push(lang === 'zh'
                    ? `    [${++stepCount}] ${startCompName} 投入资金 ${flowNeeded} 万. (余额: ${simulatedBalances[startCompId]} 万)`
                    : `    [${++stepCount}] ${startCompName} uses funds ${flowNeeded}. (Bal: ${simulatedBalances[startCompId]})`);

                // Steps: C1->C2, C2->C3...
                for (let i = 0; i < chainIds.length - 1; i++) {
                    const fromId = chainIds[i];
                    const toId = chainIds[i + 1];
                    const fromName = nameMap[fromId] || fromId;
                    const toName = nameMap[toId] || toId;

                    // Technically 'from' pays 'to'.
                    // 'from' has already been debited? 
                    // No. In this model:
                    // S->C1 (C1 Bal decreases).
                    // flow arrives at C1.
                    // C1->C2 (C1 pays C2).
                    // Implicitly: C1 receives from prev?
                    // Wait. S->C1 is "C1 using its own money".
                    // Then C1 pays C2.
                    // So C2 receives money.
                    simulatedBalances[toId] += flowNeeded;

                    logs.push(lang === 'zh'
                        ? `    [${++stepCount}] ${fromName} -> ${toName}: ${flowNeeded} 万. ${toName} 收到款项. (余额: ${simulatedBalances[toId]} 万)`
                        : `    [${++stepCount}] ${fromName} -> ${toName}: ${flowNeeded}. ${toName} receives. (Bal: ${simulatedBalances[toId]})`);

                    // If C2 pays C3, C2 uses that money?
                    // Yes, C2->C3 consumes the money C2 just got.
                    // So if chain continues, we debit C2 immediately?
                    // Let's just update the simulation to reflect the NET usage for intermediates?
                    // No, user said "A pays B, B receives...".
                    // So:
                    // S -> A. (A - 100).
                    // A -> B. (B + 100).
                    // B -> C. (B - 100, C + 100).
                    if (i < chainIds.length - 2) {
                        simulatedBalances[toId] -= flowNeeded;
                    }
                }
            }
            return;
        }

        // Greedy DFS on flow to decompose
        if (flowNeeded <= 0.000001) return;

        for (let i = 0; i < tempAdj[u].length; i++) {
            const e = tempAdj[u][i];
            if (e.flow > 0 && e.capacity > 0) { // e.capacity check irrelevant for residual? No, e.flow is what moves.
                // Wait, e.flow is the assigned flow.
                const move = Math.min(flowNeeded, e.flow);
                if (move > 0) {
                    tempAdj[u][i].flow -= move; // Consume for decomposition
                    const nextNodeName = revNodeMap.get(e.to)!;

                    // Create Transaction object if it is a Debt Edge
                    if (e.isDebt && e.originalDebtId) {
                        // Aggregation? 
                        // We can just push granular or aggregate later.
                        // Let's aggregate in a map separately, here just logs?
                        // Actually, let's just push unique transactions to a list after decomposition
                    }

                    if (e.to !== getNodeId(T)) {
                        decomposeDFS(e.to, move, [...path, nextNodeName]);
                    } else {
                        decomposeDFS(e.to, move, [...path]); // Don't add T to name path
                    }

                    flowNeeded -= move;
                    if (flowNeeded <= 0.000001) break;
                }
            }
        }
    };

    // Start decomposition from S's neighbors
    const sIdx = getNodeId(S);
    tempAdj[sIdx].forEach(e => {
        if (e.flow > 0) {
            const startNode = revNodeMap.get(e.to)!;
            const move = e.flow;
            e.flow = 0; // Consume
            decomposeDFS(e.to, move, [startNode]);
        }
    });

    // Generate Final Transactions List (Aggregated)
    for (let u = 0; u < numNodes; u++) {
        for (const e of adj[u]) {
            if (e.isDebt && e.flow > 0) {
                const src = revNodeMap.get(u)!;
                const tgt = revNodeMap.get(e.to)!;
                transactions.push({
                    id: Math.random().toString(36).substr(2, 9),
                    source: src,
                    target: tgt,
                    amount: e.flow
                });
            }
        }
    }

    // Log detailed transfers
    if (transactions.length > 0) {
        logs.push(lang === 'zh' ? "--- 建议执行资金划转汇总 ---" : "--- Recommended Transfers Summary ---");
        transactions.forEach(tr => {
            logs.push(lang === 'zh'
                ? `[划转] ${tr.source} -> ${tr.target}: ${tr.amount} 万`
                : `[Transfer] ${tr.source} -> ${tr.target}: ${tr.amount}`);
        });
        logs.push("--------------------------------");
    }

    const totalReduced = -minCost;
    const finalDebt = displayInitialDebt - totalReduced; // This might be approximate if we mix Global and Partial.
    // Actually, minCost is reduction from CURRENT algorithm run.
    // So total remaining = (Original - NettingReduction) - CascadeReduction?
    // Let's keep it simple: Start with 'displayInitialDebt' as the baseline for this log block.
    // If displayInitialDebt includes debts removed by Netting, we need to know Netting reduction to calculate final?
    // The user just wants to see the TOTAL start sum.
    // Let's assume displayInitialDebt is the TRUE global start.
    // And 'totalReduced' here is strictly CASCADE reduction.
    // So Final = displayInitialDebt - (displayInitialDebt - currentDebtSum) - totalReduced
    // Too complex.
    // Let's just report: Initial (Global) ..... Cascade Reduced: X .... Remaining (Global)
    // Remaining = displayInitialDebt - (netting_eliminated?) - totalReduced.
    // We don't have netting_eliminated passed here easily unless calculateCascadeMCMF knows it.
    // Let's just use currentDebtSum for the math consistent with this function's scope,
    // but Keep the "Initial: Global" log for user context.

    // Correction: The user wants "Initial Total Debt" to be the SUM OF DEBTS.
    // If we are in Cascade, the debts passed are ALREADY reduced.
    // So "Initial" for this function = currentDebtSum.
    // But we are printing "Global"

    // Let's behave:
    // Display: Initial Global: X.  (Cascade Scope: Y).
    // Reduced (in Cascade): Z.
    // Remaining (in Cascade): Y - Z.
    // (Implied Global Remaining = X - (X-Y) - Z = Y - Z).
    // So Final Remaining is the same.

    const finalLocalDebt = currentDebtSum - totalReduced;
    // Calculate global stats
    const globalRunningDebt = displayInitialDebt;
    // displayInitialDebt is the Original Total.
    // currentDebtSum is what entered Cascade (Post-Netting).
    // So Netting Reduced = displayInitialDebt - currentDebtSum.
    // Cascade Reduced = totalReduced.
    // Total Reduced = (displayInitialDebt - currentDebtSum) + totalReduced.
    // Final Global Remaining = displayInitialDebt - Total Reduced.

    const nettingReduced = displayInitialDebt - currentDebtSum;
    const globalTotalReduced = nettingReduced + totalReduced;
    const globalRemaining = displayInitialDebt - globalTotalReduced;

    logs.push(lang === 'zh'
        ? `算法结束。\n原始总债务: ${displayInitialDebt}\n总消除: ${globalTotalReduced} (抵销: ${nettingReduced}, 级联: ${totalReduced})\n最终剩余: ${globalRemaining}\n总投入资金: ${totalFlow}`
        : `Algorithm Complete.\nOriginal Total Debt: ${displayInitialDebt}\nTotal Reduced: ${globalTotalReduced} (Netting: ${nettingReduced}, Cascade: ${totalReduced})\nFinal Remaining: ${globalRemaining}\nTotal Cash Used: ${totalFlow}`);

    const finalBalances: Record<string, number> = {};
    const fundUsage: Record<string, number> = {};

    companies.forEach(c => {
        const u = getNodeId(c.id);

        // Flow from S to u
        const sEdge = adj[getNodeId(S)].find(e => e.to === u);
        const flowFromS = sEdge ? sEdge.flow : 0; // S->u flow is stored in S's adj list

        // Flow from u to T
        const tEdge = adj[u].find(e => e.to === getNodeId(T));
        const flowToT = tEdge ? tEdge.flow : 0;

        finalBalances[c.id] = c.balance - flowFromS + flowToT;
        if (flowFromS > 0) {
            fundUsage[c.id] = flowFromS;
        }
    });

    // Append Fund Usage Log
    const payingCompanies = Object.keys(fundUsage);
    if (payingCompanies.length > 0) {
        logs.push(lang === 'zh' ? "--- 资金投入明细 ---" : "--- Fund Usage Summary ---");
        payingCompanies.forEach(c => {
            logs.push(lang === 'zh'
                ? `${c}: 投入资金 ${fundUsage[c]} 万`
                : `${c}: Funds Used ${fundUsage[c]}`);
        });
        logs.push("--------------------------------");
    } else if (totalFlow === 0) {
        logs.push(lang === 'zh' ? "--- 资金投入明细 ---" : "--- Fund Usage Summary ---");
        logs.push(lang === 'zh' ? "无资金投入 (全额抵销或无须处理)" : "No funds used (Fully netted or no action needed)");
        logs.push("--------------------------------");
    }

    // Append Final Balance Snapshot
    logs.push(lang === 'zh' ? "--- 最终资金余额快照 ---" : "--- Final Balances Snapshot ---");
    companies.forEach(c => {
        logs.push(lang === 'zh'
            ? `${c.name}: ${simulatedBalances[c.id]} 万`
            : `${c.name}: ${simulatedBalances[c.id]}`);
    });
    logs.push("--------------------------------");

    return { transactions, logs, finalBalances };
}


function calculatePooling(companies: Company[], debts: Debt[], targetId: string, lang: 'en' | 'zh') {
    // Basic stub or simpler logic
    return { transactions: [], logs: [lang === 'zh' ? '暂未实现' : 'Not Implemented'] };
}
