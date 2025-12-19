import * as XLSX from "xlsx";
import { Company, Debt } from "@/types";
import { EXCEL_HEADERS } from "@/lib/i18n";

export const parseExcel = (
    file: File,
    lang: 'en' | 'zh' = 'zh'
): Promise<{ companies: Company[]; debts: Debt[] }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });

                const companySheetName = workbook.SheetNames[0];
                const debtSheetName = workbook.SheetNames[1];

                const companiesRaw = XLSX.utils.sheet_to_json(workbook.Sheets[companySheetName]);
                const debtsRaw = XLSX.utils.sheet_to_json(workbook.Sheets[debtSheetName]);

                // Helper to get value checking both EN and ZH keys
                const getVal = (row: any, keys: string[]) => {
                    for (const k of keys) {
                        if (row[k] !== undefined) return row[k];
                    }
                    return undefined;
                };

                // Define keys
                const K = {
                    cid: ["id", "ID", EXCEL_HEADERS.zh.id],
                    cname: ["name", "Name", "Company", EXCEL_HEADERS.zh.name],
                    cbal: ["balance", "Balance", EXCEL_HEADERS.zh.balance],
                    cmin: ["minReserved", "MinReserved", EXCEL_HEADERS.zh.minReserved],
                    did: ["id", "ID"],
                    dsrc: ["source", "Source", "Debtor", EXCEL_HEADERS.zh.source],
                    dtgt: ["target", "Target", "Creditor", EXCEL_HEADERS.zh.target],
                    damt: ["amount", "Amount", EXCEL_HEADERS.zh.amount],
                };

                const companies: Company[] = companiesRaw.map((row: any) => {
                    const name = String(getVal(row, K.cname) || "Unknown").trim();
                    const idVal = getVal(row, K.cid);
                    // If no ID provided, use Name as ID. 
                    const id = idVal ? String(idVal).trim() : name || Math.random().toString(36).substr(2, 9);

                    return {
                        id,
                        name,
                        balance: Number(getVal(row, K.cbal) || 0),
                        minReserved: Number(getVal(row, K.cmin) || 0)
                    };
                });

                const debts: Debt[] = debtsRaw.map((row: any) => ({
                    id: String(getVal(row, K.did) || Math.random().toString(36).substr(2, 9)),
                    source: String(getVal(row, K.dsrc) || "").trim(),
                    target: String(getVal(row, K.dtgt) || "").trim(),
                    amount: Number(getVal(row, K.damt) || 0)
                })).filter(d => d.source && d.target && d.amount > 0);

                resolve({ companies, debts });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const exportToExcel = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Result");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const downloadTemplate = (lang: 'en' | 'zh') => {
    const wb = XLSX.utils.book_new();

    // Companies Sheet
    const companyHeaders = lang === 'zh'
        ? [EXCEL_HEADERS.zh.name, EXCEL_HEADERS.zh.balance]
        : ["Name", "Balance"];

    const companyData = [
        { [companyHeaders[0]]: lang === 'zh' ? "公司A" : "Company A", [companyHeaders[1]]: 1000 },
        { [companyHeaders[0]]: lang === 'zh' ? "公司B" : "Company B", [companyHeaders[1]]: 500 },
        { [companyHeaders[0]]: lang === 'zh' ? "公司C" : "Company C", [companyHeaders[1]]: 200 }
    ];

    const wsCompanies = XLSX.utils.json_to_sheet(companyData);
    // Adjust column width
    wsCompanies['!cols'] = [{ wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsCompanies, "Companies");

    // Debts Sheet
    const debtHeaders = lang === 'zh'
        ? [EXCEL_HEADERS.zh.source, EXCEL_HEADERS.zh.target, EXCEL_HEADERS.zh.amount]
        : ["Debtor", "Creditor", "Amount"];

    const debtData = [
        { [debtHeaders[0]]: lang === 'zh' ? "公司A" : "Company A", [debtHeaders[1]]: lang === 'zh' ? "公司B" : "Company B", [debtHeaders[2]]: 100 },
        { [debtHeaders[0]]: lang === 'zh' ? "公司B" : "Company B", [debtHeaders[1]]: lang === 'zh' ? "公司C" : "Company C", [debtHeaders[2]]: 100 },
        { [debtHeaders[0]]: lang === 'zh' ? "公司C" : "Company C", [debtHeaders[1]]: lang === 'zh' ? "公司A" : "Company A", [debtHeaders[2]]: 100 }
    ];

    const wsDebts = XLSX.utils.json_to_sheet(debtData);
    // Adjust column width
    wsDebts['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDebts, "Debts");

    XLSX.writeFile(wb, `mns_template_${lang}.xlsx`);
};
