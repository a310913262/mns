import { Company, Debt, Transaction } from "@/types";

export function calculateNetting(companies: Company[], debts: Debt[]): Transaction[] {
    // 1. Create a mutable copy of debts
    // We represent graph as adjacency list: adj[u] = [{v, amount, id}]
    let currentDebts = debts.map(d => ({ ...d }));
    let hasCycle = true;

    while (hasCycle) {
        hasCycle = false;
        const adj: Record<string, { target: string; amount: number; index: number }[]> = {};

        // Build Graph
        currentDebts.forEach((d, idx) => {
            if (d.amount <= 0) return;
            if (!adj[d.source]) adj[d.source] = [];
            adj[d.source].push({ target: d.target, amount: d.amount, index: idx });
        });

        // DFS for Cycle Detection
        const visited: Set<string> = new Set();
        const recursionStack: Set<string> = new Set();
        const path: { source: string; edgeIndex: number }[] = [];

        // Helper to find cycle
        const findCycle = (node: string): boolean => {
            visited.add(node);
            recursionStack.add(node);

            const outgoing = adj[node] || [];
            for (const edge of outgoing) {
                path.push({ source: node, edgeIndex: edge.index });

                if (recursionStack.has(edge.target)) {
                    // Cycle found!
                    // Trace back path to find the cycle segment
                    // The cycle is from edge.target -> ... -> node -> edge.target
                    return true;
                }

                if (!visited.has(edge.target)) {
                    if (findCycle(edge.target)) return true;
                }
                path.pop();
            }

            recursionStack.delete(node);
            return false;
        };

        // Run DFS on all nodes
        for (const company of companies) {
            if (!visited.has(company.id)) {
                if (findCycle(company.id)) {
                    hasCycle = true;
                    break;
                }
            }
        }

        if (hasCycle) {
            // Extract cycle from path
            // path ends with the edge causing the cycle (u -> v where v is in stack)
            // But 'path' list contains the DFS traversal. We need to identify where v is.
            const lastEdge = path[path.length - 1];
            // We need to know who the target of lastEdge was. 
            // We didn't store target in 'path', only edgeIndex.
            const targetOfLast = currentDebts[lastEdge.edgeIndex].target;

            // Find where this target appears in the path as a SOURCE
            const startIdx = path.findIndex(p => p.source === targetOfLast);

            if (startIdx !== -1) {
                const cyclePath = path.slice(startIdx);
                // Find min amount in cycle
                let minAmount = Infinity;
                cyclePath.forEach(p => {
                    const amt = currentDebts[p.edgeIndex].amount;
                    if (amt < minAmount) minAmount = amt;
                });

                // Reduce all by minAmount
                cyclePath.forEach(p => {
                    currentDebts[p.edgeIndex].amount -= minAmount;
                });

                // Remove 0 debts
                currentDebts = currentDebts.filter(d => d.amount > 1e-6); // Floating point tolerance
            } else {
                // Should not happen if logic is correct
                hasCycle = false;
            }
        }
    }

    // Optimize: Combine parallel edges? (A->B 10, A->B 20 -> A->B 30)
    // Not strictly "cycle" but standard netting.
    const combinedDebts: Record<string, number> = {};
    currentDebts.forEach(d => {
        const key = `${d.source}->${d.target}`;
        combinedDebts[key] = (combinedDebts[key] || 0) + d.amount;
    });

    const finalTransactions: Transaction[] = Object.entries(combinedDebts).map(([key, amount]) => {
        const [source, target] = key.split('->');
        return {
            id: Math.random().toString(36).substr(2, 9),
            source,
            target,
            amount
        };
    });

    return finalTransactions;
}
