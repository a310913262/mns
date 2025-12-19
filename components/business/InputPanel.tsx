"use client";

import { useState, useRef } from "react";
import { useFinanceStore } from "@/store/useFinanceStore";
import { parseExcel, downloadTemplate } from "@/lib/utils/excel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, Upload, Download } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function InputPanel() {
    const store = useFinanceStore();
    const { t, lang } = useI18n();
    const [newCompany, setNewCompany] = useState({ name: "", balance: 0 });
    const [newDebt, setNewDebt] = useState({ source: "", target: "", amount: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddCompany = () => {
        const trimmedName = newCompany.name.trim();
        if (!trimmedName) return;

        if (store.companies.some(c => c.name === trimmedName)) {
            alert(lang === 'zh' ? "公司名称已存在" : "Company name already exists");
            return;
        }

        store.addCompany({
            id: Math.random().toString(36).substr(2, 9),
            name: trimmedName,
            balance: newCompany.balance,
        });
        setNewCompany({ name: "", balance: 0 });
    };

    const handleAddDebt = () => {
        if (!newDebt.source || !newDebt.target || newDebt.amount <= 0 || newDebt.source === newDebt.target) return;
        store.addDebt({
            id: Math.random().toString(36).substr(2, 9),
            source: newDebt.source,
            target: newDebt.target,
            amount: newDebt.amount,
        });
        setNewDebt({ source: "", target: "", amount: 0 });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { companies, debts } = await parseExcel(file, lang);
            store.setCompanies(companies);
            store.setDebts(debts);
            alert(`Imported ${companies.length} companies and ${debts.length} debts.`);
        } catch (err) {
            console.error(err);
            alert("Failed to parse Excel file.");
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>{t.companies}</CardTitle>
                    <div className="flex gap-2">
                        <Input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" /> {t.importExcel}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadTemplate(lang)}>
                            <Download className="w-4 h-4 mr-2" />
                            {t.downloadTemplate}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <Input
                            placeholder={t.name}
                            value={newCompany.name}
                            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                        />
                        <Input
                            type="number"
                            placeholder={t.balance}
                            value={newCompany.balance}
                            onChange={(e) => setNewCompany({ ...newCompany, balance: Number(e.target.value) })}
                        />
                        <Button onClick={handleAddCompany}><Plus className="w-4 h-4" /> {t.addCompany}</Button>
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.name}</TableHead>
                                    <TableHead>{t.balance}</TableHead>
                                    <TableHead>{t.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {store.companies.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell>{c.name}</TableCell>
                                        <TableCell>{c.balance}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => store.removeCompany(c.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t.debts}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-4">
                        <Select onValueChange={(v) => setNewDebt({ ...newDebt, source: v })} value={newDebt.source}>
                            <SelectTrigger><SelectValue placeholder={t.debtor} /></SelectTrigger>
                            <SelectContent>
                                {store.companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="px-2 self-center">to</div>
                        <Select onValueChange={(v) => setNewDebt({ ...newDebt, target: v })} value={newDebt.target}>
                            <SelectTrigger><SelectValue placeholder={t.creditor} /></SelectTrigger>
                            <SelectContent>
                                {store.companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            placeholder={t.amount}
                            value={newDebt.amount}
                            onChange={(e) => setNewDebt({ ...newDebt, amount: Number(e.target.value) })}
                        />
                        <Button onClick={handleAddDebt}><Plus className="w-4 h-4" /> {t.addDebt}</Button>
                    </div>
                    <div className="max-h-[300px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.debtor}</TableHead>
                                    <TableHead>{t.creditor}</TableHead>
                                    <TableHead>{t.amount}</TableHead>
                                    <TableHead>{t.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {store.debts.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell>{store.companies.find(c => c.id === d.source)?.name || d.source}</TableCell>
                                        <TableCell>{store.companies.find(c => c.id === d.target)?.name || d.target}</TableCell>
                                        <TableCell>{d.amount}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => store.removeDebt(d.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
