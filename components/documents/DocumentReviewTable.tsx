import React, { useState } from 'react';
import { 
  FileText, CheckCircle, XCircle, Clock, Download, 
  AlertCircle, PlusCircle, Eye, RefreshCcw
} from 'lucide-react';
import { SubmittedDocument, RequiredDocument, UserProfile } from '../../types';
import { apiFetch } from '../../services/api';

interface DocumentReviewTableProps {
  planId: string;
  planPk: number;
  documents: SubmittedDocument[];
  requirements: RequiredDocument[];
  user: UserProfile;
  onRefresh: () => void;
}

const DocumentReviewTable: React.FC<DocumentReviewTableProps> = ({
  planId,
  planPk,
  documents,
  requirements,
  user,
  onRefresh
}) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({ label: '', code: '', description: '', visibility: '' });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'text-green-500 bg-green-500/10';
      case 'REJECTED': return 'text-red-500 bg-red-500/10';
      case 'SUPERSEDED': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  const handleVerify = async (docId: number) => {
    if (!window.confirm("Mark this document as verified?")) return;
    setActionLoading(docId);
    try {
      await apiFetch(`/submitted-documents/${docId}/verify/`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      alert("Failed to verify document.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (docId: number) => {
    const reason = window.prompt("Enter rejection reason (min 10 chars):");
    if (!reason || reason.length < 10) return;
    setActionLoading(docId);
    try {
      await apiFetch(`/submitted-documents/${docId}/reject_document/`, { 
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      onRefresh();
    } catch (err) {
      alert("Failed to reject document.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestDocument = async () => {
    if (!requestData.label || !requestData.code) return;
    try {
      await apiFetch(`/plans/${planPk}/request_document/`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      setIsRequestModalOpen(false);
      setRequestData({ label: '', code: '', description: '', visibility: '' });
      onRefresh();
    } catch (err) {
      alert("Failed to request document.");
    }
  };

  // Group documents by required_doc code to show versions
  const groupedDocs = requirements.map(req => {
    const subs = documents.filter(d => d.required_doc === req.id || (d.required_doc === null && d.label === req.label));
    return { req, subs: subs.sort((a, b) => b.version - a.version) };
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FileText className="text-blue-400" />
          Document Checklist & Submissions
        </h3>
        {['RECEPTION', 'ADMIN', 'DEPT_OFFICER', 'DEPT_HEAD'].includes(user.role) && (
          <button 
            onClick={() => setIsRequestModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-all"
          >
            <PlusCircle size={16} />
            Request Additional Doc
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-6 py-3">Requirement</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Latest Upload</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {groupedDocs.map(({ req, subs }) => {
              const latest = subs[0];
              return (
                <tr key={req.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{req.label}</div>
                    <div className="text-xs text-gray-500">{req.code} {req.is_optional ? '(Optional)' : ''}</div>
                  </td>
                  <td className="px-6 py-4">
                    {latest ? (
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(latest.status)}`}>
                        {latest.status}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold text-gray-500 bg-gray-500/10 uppercase">
                        Missing
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {latest ? (
                      <div>
                        <div className="text-sm">{latest.uploaded_by_name}</div>
                        <div className="text-xs text-gray-500">v{latest.version} • {new Date(latest.uploaded_at).toLocaleDateString()}</div>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-sm italic">Not yet uploaded</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {latest && (
                        <>
                          <a 
                            href={`/api/submitted-documents/${latest.id}/download/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                            title="Download"
                          >
                            <Download size={18} />
                          </a>
                          {user.role === 'RECEPTION' && latest.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleVerify(latest.id)}
                                className="p-2 hover:bg-green-500/20 rounded-lg text-green-500 transition-colors"
                                title="Verify"
                                disabled={actionLoading === latest.id}
                              >
                                {actionLoading === latest.id ? <RefreshCcw className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                              </button>
                              <button 
                                onClick={() => handleReject(latest.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors"
                                title="Reject"
                                disabled={actionLoading === latest.id}
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PlusCircle className="text-blue-400" />
                Request Additional Document
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Document Label</label>
                  <input 
                    type="text"
                    value={requestData.label}
                    onChange={(e) => setRequestData({...requestData, label: e.target.value})}
                    placeholder="e.g. NSSA Compliance Letter"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Internal Code</label>
                  <input 
                    type="text"
                    value={requestData.code}
                    onChange={(e) => setRequestData({...requestData, code: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                    placeholder="e.g. NSSA_CERT"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Description / Reason</label>
                  <textarea 
                    value={requestData.description}
                    onChange={(e) => setRequestData({...requestData, description: e.target.value})}
                    placeholder="Explain why this is needed..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestDocument}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentReviewTable;
