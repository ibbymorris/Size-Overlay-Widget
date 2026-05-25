'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalysisResult {
  size: string;
  height: string;
  isNewModel: boolean;
  codename: string;
  modelId: string;
}

interface ModelEntity {
  id: string;
  codename: string;
  estimatedHeight: string;
  visualDescription: string;
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [models, setModels] = useState<ModelEntity[]>([]);

  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ModelEntity>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const distributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    models.forEach(m => {
      counts[m.estimatedHeight] = (counts[m.estimatedHeight] || 0) + 1;
    });
    return Object.keys(counts)
      .map(k => ({ name: k, count: counts[k] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [models]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (Array.isArray(data)) {
        setModels(data);
      }
    } catch (error) {
      console.error('Failed to fetch models', error);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;

        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageBase64: base64Data }),
        });

        const data = await res.json();
        if (res.ok) {
          setResult(data);
          // Refresh models list as a new one might have been added
          fetchModels();
        } else {
          alert('Error analyzing image: ' + data.error);
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setLoading(false);
        alert('Failed to read file.');
      };
    } catch (err: any) {
      setLoading(false);
      alert('An unexpected error occurred: ' + err.message);
    }
  };

  const clearModels = async () => {
    try {
      await fetch('/api/models', { method: 'DELETE' });
      fetchModels();
    } catch (error) {
      console.error('Failed to clear memory', error);
    }
  };

  const deleteModel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/models?id=${id}`, { method: 'DELETE' });
      fetchModels();
      if (editingModelId === id) setEditingModelId(null);
    } catch (error) {
      console.error('Failed to delete model', error);
    }
  };

  const handleEditClick = (model: ModelEntity) => {
    setEditingModelId(model.id);
    setEditForm({
      id: model.id,
      codename: model.codename,
      estimatedHeight: model.estimatedHeight,
      visualDescription: model.visualDescription
    });
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingModelId(null);
    setEditForm({});
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        fetchModels();
        setEditingModelId(null);
      } else {
        const data = await res.json();
        alert('Failed to update model: ' + data.error);
      }
    } catch (err) {
      alert('Failed to update model');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="space-y-2">
          <h1 className="text-4xl font-medium tracking-tight text-neutral-900">Squarespace Overlay Generator</h1>
          <p className="text-neutral-500 max-w-2xl text-lg">
            Upload an image of a model wearing a garment. The AI will estimate the sizing, identify if the model is known from our database to keep measurements consistent across products, and generate a beautiful overlay widget.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Main Workspace */}
          <div className="md:col-span-2 flex flex-col space-y-6">
            {!previewUrl ? (
              <div 
                className="border-2 border-dashed border-neutral-300 rounded-3xl bg-white p-12 flex flex-col items-center justify-center text-center hover:bg-neutral-50 transition cursor-pointer h-96 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="p-4 bg-neutral-100 rounded-full mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-neutral-600" />
                </div>
                <h3 className="text-lg font-medium text-neutral-800">Upload Product Image</h3>
                <p className="text-sm text-neutral-400 mt-2">Drag and drop or click to browse</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden bg-neutral-200 border border-neutral-200 shadow-sm flex items-center justify-center min-h-[500px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="max-h-[700px] w-full object-contain" />
                
                {result && (
                  <div className="absolute top-6 left-6 z-10 animate-in fade-in zoom-in duration-300">
                    <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-black/5 font-medium text-black tracking-tight tracking-wide shadow-black/10 flex items-center">
                      <span>{result.size} - {result.height}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {previewUrl && (
              <div className="flex gap-4 items-center">
                <button 
                  onClick={handleAnalyze} 
                  disabled={loading}
                  className="flex-1 bg-black text-white px-6 py-4 rounded-xl font-medium shadow-sm hover:bg-neutral-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Model & Fit...
                    </>
                  ) : (
                    'Analyze & Generate Widget'
                  )}
                </button>
                <button 
                  onClick={handleClear} 
                  className="px-6 py-4 rounded-xl bg-white border border-neutral-200 font-medium text-neutral-700 hover:bg-neutral-50 transition"
                  disabled={loading}
                >
                  Clear Image
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {result && (
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Analysis Result
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-neutral-400 font-mono uppercase">Detected Identity</p>
                    <p className="text-lg font-medium text-neutral-900 mt-1">{result.codename}</p>
                    {result.isNewModel ? (
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        New Model Added
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Known from Database
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-neutral-400 font-mono uppercase">Estimated Height</p>
                      <p className="text-lg font-medium text-neutral-900 mt-1">{result.height}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 font-mono uppercase">Garment Size</p>
                      <p className="text-lg font-medium text-neutral-900 mt-1">{result.size}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {models.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm animate-in fade-in duration-500">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">
                  Height Distribution
                </h3>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distributionData}>
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f5f5f5'}} 
                        contentStyle={{borderRadius: '12px', border: '1px solid #e5e5e5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} 
                      />
                      <Bar dataKey="count" fill="#171717" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Model Memory Bank
                </h3>
                {models.length > 0 && (
                  <button 
                    onClick={clearModels}
                    className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition"
                    title="Clear Database"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4">
                {models.length === 0 ? (
                  <div className="text-center text-neutral-400 mt-12 px-4">
                    <p>No models saved yet. Upload an image to analyze and remember a model.</p>
                  </div>
                ) : (
                  models.map((m) => (
                    <div 
                      key={m.id} 
                      className={`bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-100 flex flex-col gap-1 transition-colors ${editingModelId === m.id ? 'ring-2 ring-black border-transparent' : 'hover:bg-neutral-100 cursor-pointer'}`}
                      onClick={() => !editingModelId && handleEditClick(m)}
                    >
                      {editingModelId === m.id ? (
                        <div className="space-y-3" onClick={e => e.stopPropagation()}>
                          <div>
                            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Codename</label>
                            <input 
                              type="text" 
                              value={editForm.codename || ''} 
                              onChange={e => setEditForm({...editForm, codename: e.target.value})}
                              className="w-full text-sm border border-neutral-300 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Height</label>
                            <input 
                              type="text" 
                              value={editForm.estimatedHeight || ''} 
                              onChange={e => setEditForm({...editForm, estimatedHeight: e.target.value})}
                              className="w-full text-sm border border-neutral-300 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Description</label>
                            <textarea 
                              value={editForm.visualDescription || ''} 
                              onChange={e => setEditForm({...editForm, visualDescription: e.target.value})}
                              className="w-full text-sm border border-neutral-300 rounded bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button className="text-xs px-3 py-1.5 rounded text-red-600 hover:bg-red-50 hover:text-red-700 transition font-medium mr-auto" onClick={(e) => deleteModel(e, m.id)}>Delete</button>
                            <button className="text-xs px-3 py-1.5 rounded text-neutral-600 hover:bg-neutral-200 transition font-medium" onClick={cancelEdit}>Cancel</button>
                            <button className="text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-neutral-800 transition font-medium" onClick={saveEdit}>Save Changes</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-neutral-900">{m.codename}</span>
                            <span className="text-xs font-mono text-neutral-500 bg-white px-2 py-1 rounded border border-neutral-200">
                              {m.estimatedHeight}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{m.visualDescription}</p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
