'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to process invoice');
      
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 flex flex-col items-center font-sans">
      <div className="max-w-3xl w-full space-y-8 mt-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Logistics Intake Engine</h1>
          <p className="mt-3 text-lg text-slate-600">Upload a scanned invoice to instantly extract routing and volume data.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:bg-slate-50 transition-colors flex flex-col items-center justify-center">
            <input 
              type="file" 
              accept="image/*,.pdf" 
              onChange={handleFileChange} 
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {file && <p className="mt-4 text-sm text-slate-700 font-medium bg-slate-100 px-4 py-2 rounded-md">Ready to scan: {file.name}</p>}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className={mt-6 w-full py-4 px-4 rounded-xl text-white font-bold text-lg transition-all ${!file || loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'}}
          >
            {loading ? 'Processing Document via OCR...' : 'Process Invoice'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-medium">
            Error: {error}
          </div>
        )}

        {result && (
          <div className="bg-slate-900 rounded-2xl shadow-xl p-6 overflow-hidden">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 border-b border-slate-700 pb-3 flex items-center justify-between">
              <span>Extracted Data Payload</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Success</span>
            </h3>
            <pre className="text-emerald-400 text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}