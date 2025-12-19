const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.utils.book_new();

// Companies Sheet
const companies = [
    { id: 'c1', name: 'Alpha Corp', balance: 1000, minReserved: 100 },
    { id: 'c2', name: 'Beta Ltd', balance: 500, minReserved: 0 },
    { id: 'c3', name: 'Gamma Inc', balance: 200, minReserved: 50 },
];
const wsCompanies = XLSX.utils.json_to_sheet(companies);
XLSX.utils.book_append_sheet(wb, wsCompanies, "Companies");

// Debts Sheet
const debts = [
    { id: 'd1', source: 'c1', target: 'c2', amount: 100 },
    { id: 'd2', source: 'c2', target: 'c3', amount: 100 },
    { id: 'd3', source: 'c3', target: 'c1', amount: 100 },
];
const wsDebts = XLSX.utils.json_to_sheet(debts);
XLSX.utils.book_append_sheet(wb, wsDebts, "Debts");

XLSX.writeFile(wb, path.join(__dirname, '../public/template.xlsx'));
console.log("Template created at public/template.xlsx");
