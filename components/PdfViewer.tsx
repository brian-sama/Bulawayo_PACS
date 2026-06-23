import React, { useState, useEffect } from 'react';

interface PdfViewerProps {
  /** Authenticated API URL, e.g. /api/plans/123/download/ */
  url: string;
  title?: string;
  className?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  title = 'Document',
  className = '',
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | undefined;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('access_token');
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setLoading(false);
      })
      .catch(err => {
        setError((err as Error).message);
        setLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (loading)
    return (
      <div
        className={`flex items-center justify-center bg-black/20 rounded-xl ${className}`}
        style={{ minHeight: 400 }}
      >
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-white/10 rounded-full animate-spin mx-auto" />
          <p className="text-white/50 text-sm">Loading {title}...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div
        className={`flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-xl ${className}`}
        style={{ minHeight: 200 }}
      >
        <p className="text-red-400 text-sm">Failed to load document: {error}</p>
      </div>
    );

  return (
    <object
      data={blobUrl!}
      type="application/pdf"
      className={`w-full rounded-xl ${className}`}
      style={{ minHeight: 600 }}
      title={title}
    >
      <a
        href={blobUrl!}
        download={title}
        className="text-blue-400 underline text-sm"
      >
        Download {title}
      </a>
    </object>
  );
};
