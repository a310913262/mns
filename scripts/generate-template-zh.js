const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.utils.book_new();

// Companies Sheet (Chinese Headers)
const companyData = [
    { name: "Alpha Corp", balance: 1000 },
    { name: "Beta Ltd", balance: 500 },
    { name: "Gamma Inc", balance: 200 }
];
// Skip header to use custom one
const wsCompanies = XLSX.utils.json_to_sheet(companyData, { skipHeader: true });
XLSX.utils.sheet_add_aoa(wsCompanies, [["公司名称", "当前余额"]], { origin: "A1" });
XLSX.utils.book_append_sheet(wb, wsCompanies, "Companies");

// Debts Sheet (Chinese Headers)
const debtData = [
    { source: "Alpha Corp", target: "Beta Ltd", amount: 100 },
    { source: "Beta Ltd", target: "Gamma Inc", amount: 100 },
    { source: "Gamma Inc", target: "Alpha Corp", amount: 100 }
];
const wsDebts = XLSX.utils.json_to_sheet(debtData, { skipHeader: true });
XLSX.utils.sheet_add_aoa(wsDebts, [["欠款方", "收款方", "金额"]], { origin: "A1" });
XLSX.utils.book_append_sheet(wb, wsDebts, "Debts");

XLSX.writeFile(wb, path.join(__dirname, '../public/template_zh.xlsx'));
console.log("Chinese Template created at public/template_zh.xlsx");