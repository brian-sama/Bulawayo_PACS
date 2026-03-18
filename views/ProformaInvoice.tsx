import React, { useRef } from 'react';

interface LineItem {
    label: string;
    vote_no: string;
    amount_zwl: number;
    amount_usd: number;
    is_rates_payment?: boolean;
}

interface ProformaViewProps {
    invoice: {
        invoice_number: string;
        issued_at: string;
        plan?: any;
        issued_by_name?: string;
        notes?: string;
        line_items: LineItem[];
        payment_receipts?: any[];
        status: string;
        total_zwl: number;
        total_usd: number;
        reception_contacts?: string;
        rates_comment?: string;
    };
    onClose?: () => void;
}

/**
 * Printable Proforma Invoice.
 * Uses window.print() + @media print CSS to hide app chrome.
 * Mirrors the BCC Building Inspectorate proforma template.
 */
export const ProformaInvoiceView: React.FC<ProformaViewProps> = ({ invoice, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => window.print();

    const totalZwl = invoice.line_items?.reduce((sum, i) => sum + Number(i.amount_zwl ?? 0), 0) ?? 0;
    const totalUsd = invoice.line_items?.reduce((sum, i) => sum + Number(i.amount_usd ?? 0), 0) ?? 0;

    return (
        <>
            {/* Print-only style: hides everything outside .proforma-print-area */}
            <style>{`
                @media print {
                    body > * { display: none !important; }
                    .proforma-print-root { display: block !important; }
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 15mm 18mm; }
                }
                .proforma-print-root { display: block; }
            `}</style>

            <div className="proforma-print-root fixed inset-0 bg-black/60 z-[70] flex items-start justify-center overflow-y-auto p-6">
                <div ref={printRef} className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">

                    {/* Toolbar (hidden on print) */}
                    <div className="no-print flex items-center justify-between px-6 py-4 bg-[#003366] text-white">
                        <h2 className="font-black uppercase tracking-widest text-sm">Proforma Invoice</h2>
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-white text-[#003366] rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-all"
                            >
                                🖨 Print
                            </button>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-white/20 transition-all"
                                >
                                    ✕ Close
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Invoice Body */}
                    <div className="p-8 space-y-6 text-slate-800">

                        {/* Header */}
                        <div className="text-center border-b-2 border-[#003366] pb-6">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                                CITY OF BULAWAYO
                            </p>
                            <h1 className="text-2xl font-black text-[#003366] uppercase tracking-tight">
                                Building Inspectorate
                            </h1>
                            <p className="text-xs text-slate-500 mt-1">
                                P.O. Box 709, Bulawayo · Tel: (09) 888888 · Ref: Rates Department
                            </p>
                            <div className="mt-4 inline-block bg-[#003366]/5 border border-[#003366]/20 rounded-xl px-6 py-3">
                                <p className="text-lg font-black text-[#003366] tracking-widest">
                                    PROFORMA INVOICE
                                </p>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Invoice No.:</span>
                                    <span className="font-bold font-mono">{invoice.invoice_number}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Date Issued:</span>
                                    <span className="font-medium">
                                        {invoice.issued_at
                                            ? new Date(invoice.issued_at).toLocaleDateString('en-GB', {
                                                day: '2-digit', month: 'long', year: 'numeric'
                                              })
                                            : '–'}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Status:</span>
                                    <span className={`font-bold uppercase ${
                                        invoice.status === 'PAID' ? 'text-emerald-600' :
                                        invoice.status === 'CANCELLED' ? 'text-red-500' :
                                        'text-amber-600'
                                    }`}>{invoice.status}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Application:</span>
                                    <span className="font-bold">{invoice.plan?.plan_id ?? '–'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Stand No.:</span>
                                    <span className="font-medium">{invoice.plan?.stand_number ?? invoice.plan?.stand ?? '–'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Applicant:</span>
                                    <span className="font-medium">{invoice.plan?.client_name ?? '–'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-slate-500 w-28 shrink-0">Issued by:</span>
                                    <span className="font-medium">{invoice.issued_by_name ?? '–'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Fee Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[#003366] text-white">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-bold uppercase tracking-wider text-xs">Description</th>
                                        <th className="text-left px-4 py-3 font-bold uppercase tracking-wider text-xs w-28">Vote No.</th>
                                        <th className="text-right px-4 py-3 font-bold uppercase tracking-wider text-xs w-28">ZWL</th>
                                        <th className="text-right px-4 py-3 font-bold uppercase tracking-wider text-xs w-28">USD</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoice.line_items?.map((item, idx) => (
                                        <tr key={idx} className={item.is_rates_payment ? 'bg-amber-50' : 'bg-white'}>
                                            <td className="px-4 py-3 text-slate-700 font-medium">
                                                {item.label}
                                                {item.is_rates_payment && (
                                                    <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">Rates</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500 text-xs">{item.vote_no || '–'}</td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                {Number(item.amount_zwl || 0).toLocaleString('en-ZW', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                {Number(item.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-[#003366]/5 border-t-2 border-[#003366]/20">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-3 font-black text-[#003366] uppercase tracking-widest text-sm">
                                            TOTAL DUE
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-[#003366] text-sm">
                                            ZWL {totalZwl.toLocaleString('en-ZW', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-[#003366] text-sm">
                                            USD {totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Payment Instructions */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
                            <p className="font-bold mb-1">Payment Instructions</p>
                            <p className="text-blue-700">
                                Payment should be made at the <strong>City of Bulawayo Cashier's Office</strong> or via
                                approved EcoCash / ZIPIT channels. Upload your proof of payment on the PACS portal to
                                proceed with document verification. Quote your invoice number: <strong>{invoice.invoice_number}</strong>.
                            </p>
                        </div>

                        {/* Notes */}
                        {invoice.notes && (
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm text-slate-600">
                                <p className="font-bold text-slate-700 mb-1">Notes</p>
                                <p>{invoice.notes}</p>
                            </div>
                        )}

                        {/* Reception Feedback Section */}
                        {(invoice.rates_comment || invoice.reception_contacts) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invoice.rates_comment && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-900 font-medium">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-amber-600/60">Rates Clearance Note</p>
                                        <p>{invoice.rates_comment}</p>
                                    </div>
                                )}
                                {invoice.reception_contacts && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 font-medium">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 text-blue-600/60">BCC Reception Contacts</p>
                                        <p>{invoice.reception_contacts}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
                            <p>This is a computer-generated proforma invoice. No physical signature required.</p>
                            <p className="mt-1">
                                Bulawayo PACS · Building Inspectorate · City of Bulawayo ·{' '}
                                <span className="font-mono">{invoice.invoice_number}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};


// ─────────────────────────────────────────────
// Proforma GENERATOR FORM (used inside ReceptionGateway modal)
// ─────────────────────────────────────────────

const DEFAULT_LINE_ITEMS = [
    { label: 'Development Permit Fees', vote_no: '0074/50363', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'Administration Fees (1)', vote_no: '0071/50425', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'Admin Fees (2) Estates', vote_no: '515/50425', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'Admin Fees (3) Residential', vote_no: '201/50475', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'Fire Brigade (Change of Use)', vote_no: '033/50449', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'Engineering Services', vote_no: '0072/50449', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'VAT', vote_no: '7401/77003', amount_zwl: 0, amount_usd: 0, is_rates_payment: false },
    { label: 'Rate Payments', vote_no: '', amount_zwl: 0, amount_usd: 0, is_rates_payment: true },
];

const ALL_REQUIRED_DOCS = [
    { id: 'RECEIPT',      label: 'Proforma Invoice (Receipt / Proof of Payment)' },
    { id: 'RATES',        label: 'Clear Rates Balance (BCC Contacts)' },
    { id: 'PLAN',         label: 'Re-uploaded Plan (if modified)' },
    { id: 'ENG_CERT',     label: 'Engineer Certificate' },
    { id: 'OWNERSHIP',    label: 'Agreement of Sale / Lease Agreement' },
    { id: 'DEED',         label: 'Title Deeds' },
    { id: 'ARCH_CERT',    label: 'Architect Registration Certificate' },
    { id: 'ENG_DRAWINGS', label: "Engineer's Structural Drawings" },
    { id: 'NEIGHBOR',     label: 'Letter from Neighbor' },
];

interface ProformaGeneratorProps {
    plan: any;
    onSubmit: (lineItems: LineItem[], payload: { notes: string; reception_contacts: string; rates_comment: string }) => Promise<void>;
    onClose: () => void;
    submitting?: boolean;
}

export const ProformaGenerator: React.FC<ProformaGeneratorProps> = ({
    plan, onSubmit, onClose, submitting = false
}) => {
    const [items, setItems] = React.useState<LineItem[]>(DEFAULT_LINE_ITEMS.map(i => ({ ...i })));
    const [notes, setNotes] = React.useState('');
    const [contacts, setContacts] = React.useState('');
    const [ratesComment, setRatesComment] = React.useState('');
    const [requiredDocs, setRequiredDocs] = React.useState<string[]>(['RECEIPT']);

    const toggleDoc = (id: string) => {
        setRequiredDocs(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    const updateItem = (idx: number, field: keyof LineItem, value: any) => {
        setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const addItem = () => {
        setItems(prev => [...prev, { label: '', vote_no: '', amount_zwl: 0, amount_usd: 0 }]);
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const totalZwl = items.reduce((sum, i) => sum + Number(i.amount_zwl || 0), 0);
    const totalUsd = items.reduce((sum, i) => sum + Number(i.amount_usd || 0), 0);

    const handleSubmit = () => {
        const nonEmptyItems = items.filter(i => i.label.trim() && (Number(i.amount_zwl) > 0 || Number(i.amount_usd) > 0));
        if (nonEmptyItems.length === 0) {
            alert('Please enter at least one fee line item with a non-zero amount.');
            return;
        }
        // Encode required docs into notes so client side can read them
        const docsTag = requiredDocs.length > 0
            ? `__REQUIRED_DOCS__:${JSON.stringify(requiredDocs)}\n\n`
            : '';
        onSubmit(nonEmptyItems, { notes: docsTag + notes, reception_contacts: contacts, rates_comment: ratesComment });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-4">

                <div className="flex items-center justify-between px-6 py-4 bg-[#003366] text-white">
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-widest">Issue Proforma Invoice</h3>
                        <p className="text-[10px] text-blue-300 mt-0.5">{plan?.plan_id} · {plan?.client_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">✕</button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[70vh]">
                    {/* Fee table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left px-3 py-2 font-bold text-slate-600 text-xs uppercase">Description</th>
                                    <th className="text-left px-3 py-2 font-bold text-slate-600 text-xs uppercase w-28">Vote No.</th>
                                    <th className="text-left px-3 py-2 font-bold text-slate-600 text-xs uppercase w-28">ZWL</th>
                                    <th className="text-left px-3 py-2 font-bold text-slate-600 text-xs uppercase w-28">USD</th>
                                    <th className="w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {items.map((item, idx) => (
                                    <tr key={idx} className={item.is_rates_payment ? 'bg-amber-50' : ''}>
                                        <td className="px-2 py-2">
                                            <input
                                                value={item.label}
                                                onChange={e => updateItem(idx, 'label', e.target.value)}
                                                className="w-full bg-transparent text-slate-700 font-medium outline-none border-b border-transparent focus:border-blue-400 transition"
                                                placeholder="Fee description..."
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                value={item.vote_no}
                                                onChange={e => updateItem(idx, 'vote_no', e.target.value)}
                                                className="w-full bg-transparent text-slate-500 font-mono text-xs outline-none border-b border-transparent focus:border-blue-400 transition"
                                                placeholder="0000/00000"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                title="Amount in ZWL"
                                                placeholder="0.00"
                                                value={item.amount_zwl}
                                                onChange={e => updateItem(idx, 'amount_zwl', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent text-slate-700 outline-none border-b border-transparent focus:border-blue-400 transition text-right pr-1"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                title="Amount in USD"
                                                placeholder="0.00"
                                                value={item.amount_usd}
                                                onChange={e => updateItem(idx, 'amount_usd', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-transparent text-slate-700 outline-none border-b border-transparent focus:border-blue-400 transition text-right pr-1"
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="text-slate-300 hover:text-red-400 transition text-lg leading-none"
                                                title="Remove row"
                                            >×</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-100 border-t border-slate-200">
                                <tr>
                                    <td colSpan={2} className="px-3 py-2 font-black text-slate-700 text-xs uppercase tracking-wider">TOTAL</td>
                                    <td className="px-3 py-2 font-black text-[#003366] text-right pr-3">
                                        ZWL {totalZwl.toFixed(2)}
                                    </td>
                                    <td colSpan={2} className="px-3 py-2 font-black text-[#003366] text-right pr-3">
                                        USD {totalUsd.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <button
                        onClick={addItem}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition mb-4"
                    >
                        + Add line item
                    </button>

                    {/* Required Documents Checklist */}
                    <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-700 px-4 py-3 flex justify-between items-center">
                            <h4 className="font-black text-white text-xs uppercase tracking-widest">Required Documents After Payment</h4>
                            <span className="text-[10px] text-slate-300 font-bold">{requiredDocs.length} selected</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {ALL_REQUIRED_DOCS.map(doc => (
                                <label key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={requiredDocs.includes(doc.id)}
                                        onChange={() => toggleDoc(doc.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                                    />
                                    <span className={`text-sm font-medium ${requiredDocs.includes(doc.id) ? 'text-slate-800' : 'text-slate-400'}`}>
                                        {doc.label}
                                    </span>
                                    {requiredDocs.includes(doc.id) && (
                                        <span className="ml-auto text-[9px] font-black text-emerald-600 uppercase">✓ Required</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Clearing Rates Comment</label>
                                <textarea
                                    value={ratesComment}
                                    onChange={e => setRatesComment(e.target.value)}
                                    placeholder="Comment to clear rates balance..."
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 resize-none transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Reception Contacts</label>
                                <textarea
                                    value={contacts}
                                    onChange={e => setContacts(e.target.value)}
                                    placeholder="BCC contacts for follow-up..."
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 resize-none transition"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">General Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Any additional payment instructions..."
                                rows={5}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 resize-none transition"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 p-6 border-t border-slate-100">
                    <button onClick={onClose} className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-black text-sm text-slate-500 hover:border-slate-300 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-[2] py-3 bg-[#003366] text-white rounded-xl font-black text-sm uppercase tracking-wider hover:bg-[#002244] disabled:opacity-50 transition shadow-lg"
                    >
                        {submitting ? 'Generating...' : '📄 Issue Proforma Invoice'}
                    </button>
                </div>
            </div>
        </div>
    );
};
