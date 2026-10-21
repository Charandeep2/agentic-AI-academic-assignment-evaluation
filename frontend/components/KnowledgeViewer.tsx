'use client';

import React, { useState } from 'react';
import { BookOpen, Search, Sparkles, BrainCircuit } from '../lib/icons';
import { KNOWLEDGE_BASE_DOCS } from '../lib/mockData';

export const KnowledgeViewer: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(KNOWLEDGE_BASE_DOCS[0]);

  const filteredDocs = KNOWLEDGE_BASE_DOCS.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.keyConcepts.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
    doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>RAG Grounding Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Curated Course Knowledge Base
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Semantic course materials chunked and indexed into vector embeddings. Used by the Feedback Agent to provide grounded, syllabus-aligned corrections.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics or concepts..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Docs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Indexed Corpus Documents ({filteredDocs.length})
          </h3>
          {filteredDocs.map((doc, idx) => {
            const isSelected = selectedDoc.title === doc.title;
            return (
              <div
                key={idx}
                onClick={() => setSelectedDoc(doc)}
                className={`p-4 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {doc.course}
                </span>
                <h4 className="font-semibold text-slate-200 text-xs sm:text-sm mt-1">{doc.title}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {doc.keyConcepts.map((k, kIdx) => (
                    <span key={kIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Document Details */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                  {selectedDoc.course} Vector Chunk
                </span>
                <h2 className="text-lg font-bold text-white mt-1">{selectedDoc.title}</h2>
              </div>
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>RAG Verified</span>
              </span>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Curriculum Reference Content</h4>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                {selectedDoc.excerpt}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Key Semantic Concepts Indexed</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDoc.keyConcepts.map((concept, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-400">
              <p className="font-semibold text-indigo-300 mb-1">How this is used in Agentic AI Grading:</p>
              When a student submits code covering these topics, the RAG engine queries this document via vector similarity to ground the rubric scoring and produce specific code citations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
