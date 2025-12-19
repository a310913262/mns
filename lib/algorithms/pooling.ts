import { Company, Debt, Transaction } from "@/types";

export function calculateMaxPooling(companies: Company[], debts: Debt[], targetId: string): { steps: Transaction[], total: number } {
    // Max Flow Algorithm (Edmonds-Karp)
    // Nodes: 0..N-1 (Companies) + Source(S) + Sink(T is one of Companies, but we handle logic carefully)
    // Actually, standard Max Flow construction:
    // Super-Source (S) -> Each Company (i) with Cap = Balance(i)
    // Debt Edge (u -> v) with Cap = Amount
    // We want max flow to TargetNode.
    // Note: TargetNode itself can have balance, but effectively it's already "at target".
    // So S -> TargetNode is irrelevant for "transfer", but relevant for "Total Available"? 
    // Usually "Pooling" means moving *others* money to Target. Target's own money is already there.
    // We will maximize flow arriving at Target from OTHERS.

    if (!targetId) return { steps: [], total: 0 };

    const companyMap = new Map(companies.map((c, i) => [c.id, i]));
    const S = companies.length;
    const T = companyMap.get(targetId)!;

    if (T === undefined) return { steps: [], total: 0 };

    const numNodes = companies.length + 1; // Companies + S
    // Adjacency Matrix for Capacity and Flow (for simplicity with small N)
    // valid range: 0..numNodes-1
    // However S is index 'companies.length'.
    // We treat 'T' (target company index) as the Sink for the flow algorithm.

    const capacity = Array(numNodes).fill(0).map(() => Array(numNodes).fill(0));

    // 1. Edges from S to Companies (Supply)
    companies.forEach((c, idx) => {
        if (c.id !== targetId) {
            capacity[S][idx] = c.balance;
        }
    });

    // 2. Edges from Debts (Constraints)
    debts.forEach(d => {
        const u = companyMap.get(d.source);
        const v = companyMap.get(d.target);
        if (u !== undefined && v !== undefined) {
            capacity[u][v] += d.amount; // Add capacities if multiple debts
        }
    });

    // Edmonds-Karp
    const flow = Array(numNodes).fill(0).map(() => Array(numNodes).fill(0));
    let maxFlow = 0;

    while (true) {
        const parent = Array(numNodes).fill(-1);
        const queue = [S];
        parent[S] = S;

        while (queue.length > 0) {
            const u = queue.shift()!;
            if (u === T) break;

            for (let v = 0; v < numNodes; v++) {
                if (parent[v] === -1 && capacity[u][v] - flow[u][v] > 0) {
                    parent[v] = u;
                    queue.push(v);
                }
            }
        }

        if (parent[T] === -1) break; // No path to sink

        let pathFlow = Infinity;
        let v = T;
        while (v !== S) {
            const u = parent[v];
            pathFlow = Math.min(pathFlow, capacity[u][v] - flow[u][v]);
            v = u;
        }

        v = T;
        while (v !== S) {
            const u = parent[v];
            flow[u][v] += pathFlow;
            flow[v][u] -= pathFlow;
            v = u;
        }

        maxFlow += pathFlow;
    }

    // Extract transactions
    // We only care about flow between companies (u->v where u,v < S)
    const steps: Transaction[] = [];
    for (let u = 0; u < companies.length; u++) {
        for (let v = 0; v < companies.length; v++) {
            if (flow[u][v] > 0) {
                steps.push({
                    id: Math.random().toString(36).substr(2, 9),
                    source: companies[u].id,
                    target: companies[v].id,
                    amount: flow[u][v]
                });
            }
        }
    }

    // Total funds at Target = Target.Balance + MaxFlow
    // (The function returns 'total' usually as what ends up there)
    const targetBalance = companies.find(c => c.id === targetId)?.balance || 0;

    return { steps, total: targetBalance + maxFlow };
}
