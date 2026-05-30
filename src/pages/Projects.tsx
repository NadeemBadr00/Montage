import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, FolderOpen, Trash2, Calendar, FileVideo, Zap, Brain, Plus } from 'lucide-react';
import { AnimatedLogo } from '../components/ui/AnimatedLogo';

interface Project {
  id: string;
  name: string;
  date: string;
  mode: 'manual' | 'sandwich';
  fileCount: number;
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('ai4montage_projects');
    if (stored) {
      try {
        setProjects(JSON.parse(stored).reverse()); // الأحدث أولاً
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }
  }, []);

  const openProject = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const deleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem('ai4montage_projects', JSON.stringify(updated.reverse())); // عكس للرجوع للترتيب الأصلي
    localStorage.removeItem(`${id}_settings`);
    localStorage.removeItem(`${id}_extra_count`);
    // Ideally we should also delete files from IndexedDB, but that requires fileStore access
    // which can be done inside useFileStore if we expose a removeProject method.
  };

  return (
    <div className="min-h-screen font-sans bg-[#050810] text-slate-300" dir="ltr">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute rounded-full blur-3xl"
          style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)', top: '-10%', left: '-10%' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-20 px-6 py-5 flex items-center justify-between bg-slate-900/50 backdrop-blur-lg border-b border-white/5">
        <Link to="/" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
          <AnimatedLogo size="sm" />
          <span className="text-white font-black text-xl tracking-tight group-hover:text-cyan-400 transition-colors">AI4Montage</span>
        </Link>
        <Link to="/startup" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium" style={{ textDecoration: 'none' }}>
          <ArrowLeft className="w-4 h-4" /> العودة للرئيسية
        </Link>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4 border-b border-slate-800 pb-6" dir="rtl">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-fuchsia-400" />
              مشاريعي السابقة
            </h1>
            <p className="text-slate-500 mt-2">يمكنك استكمال العمل على أي مشروع محفوظ على هذا المتصفح.</p>
          </div>
          <Link to="/startup" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-white font-bold shadow-lg shadow-fuchsia-500/20 transition-all hover:scale-105">
            <Plus className="w-5 h-5" /> مشروع جديد
          </Link>
        </div>

        {projects.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800 border-dashed">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">لا توجد مشاريع سابقة</h3>
            <p className="text-slate-500 mb-6 text-center max-w-sm">لم تقم بإنشاء أي مشاريع بعد على هذا الجهاز. ابدأ الآن بإنشاء أول فيديو لك بالذكاء الاصطناعي.</p>
            <Link to="/startup" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-700">
              بدء مشروع جديد
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
            <AnimatePresence>
              {projects.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 hover:border-cyan-500/50 rounded-2xl p-5 group transition-all relative overflow-hidden"
                >
                  {/* Decorative glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none" />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                        {project.mode === 'sandwich' ? <Zap className="w-5 h-5 text-fuchsia-400" /> : <Brain className="w-5 h-5 text-cyan-400" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">{project.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {new Date(project.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
                      <FileVideo className="w-3.5 h-3.5" />
                      {project.fileCount} ملفات
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md" style={{
                      backgroundColor: project.mode === 'sandwich' ? 'rgba(217,70,239,0.1)' : 'rgba(34,211,238,0.1)',
                      color: project.mode === 'sandwich' ? '#f0abfc' : '#67e8f9',
                      border: `1px solid ${project.mode === 'sandwich' ? 'rgba(217,70,239,0.2)' : 'rgba(34,211,238,0.2)'}`
                    }}>
                      {project.mode === 'sandwich' ? 'Auto AI' : 'Manual'}
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-10">
                    <button onClick={() => openProject(project.id)} className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded-xl py-2 text-sm font-bold transition-all text-center">
                      استكمال العمل
                    </button>
                    <button onClick={() => deleteProject(project.id)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all" title="حذف المشروع">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
