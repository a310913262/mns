"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const dictionary = {
    en: {
        appTitle: "Intragroup Settlement & Cash Pooling",
        appDesc: "Internal debt netting, debt cascade optimization, and cash pooling system.",
        companies: "Companies",
        debts: "Debts",
        name: "Name",
        balance: "Balance",
        minReserved: "Min Reserved",
        debtor: "Debtor",
        creditor: "Creditor",
        amount: "Amount",
        importExcel: "Import Excel",
        downloadTemplate: "Download Template",
        addCompany: "Add",
        addDebt: "Add",
        originalView: "Original Debts",
        optimizedView: "Optimized View",
        runNetting: "Run Debt Cascade", /* Updated to reflect new logic */
        runPooling: "Run Cash Pooling",
        exportResult: "Export Result",
        logs: "Audit Logs",
        selectTarget: "Select Target for Pooling",
        actions: "Actions",
        totalReduced: "Total Debt Reduced",
        totalPooled: "Total Cash Pooled",
    },
    zh: {
        appTitle: "集团内部往来结算与资金归集系统",
        appDesc: "内部债务抵销、级联债务优化及资金归集系统。",
        companies: "公司列表",
        debts: "债务往来",
        name: "公司名称",
        balance: "当前余额",
        minReserved: "最低保留",
        debtor: "欠款方",
        creditor: "收款方",
        amount: "金额",
        importExcel: "导入 Excel",
        downloadTemplate: "下载模版",
        addCompany: "添加",
        addDebt: "添加",
        originalView: "原始债务网络",
        optimizedView: "优化后路径",
        runNetting: "执行债务级联优化",
        runPooling: "执行资金归集",
        exportResult: "导出结果",
        logs: "审计日志",
        selectTarget: "选择归集目标",
        actions: "操作",
        totalReduced: "减少债务总额",
        totalPooled: "归集资金总额",
    }
};

type I18nContextType = {
    lang: Lang;
    t: typeof dictionary['en'];
    setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>('zh'); // Default to Chinese

    return (
        <I18nContext.Provider value={{ lang, setLang, t: dictionary[lang] }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) throw new Error("useI18n must be used within I18nProvider");
    return context;
}

export const EXCEL_HEADERS = {
    en: {
        id: "ID", name: "Name", balance: "Balance", minReserved: "MinReserved",
        source: "Source", target: "Target", amount: "Amount"
    },
    zh: {
        id: "ID", name: "公司名称", balance: "当前余额", minReserved: "最低保留",
        source: "欠款方", target: "收款方", amount: "金额"
    }
};
