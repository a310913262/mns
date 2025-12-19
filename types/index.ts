export type Company = {
    id: string;
    name: string;
    balance: number;
    minReserved?: number;
};

export type Debt = {
    id: string;
    source: string; // Debtor
    target: string; // Creditor
    amount: number;
};

export type Transaction = {
    id: string;
    source: string;
    target: string;
    amount: number;
};
