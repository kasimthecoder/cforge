'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Project = { id: string; title: string; code: string; language: string; createdAt: string; updatedAt: string };

export default function ProjectDashboard({ projects: initialProjects }: { projects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete “${project.title}”?`)) return;
    setDeleting(project.id);
    try {
      const response = await fetch(`/api/saved-codes/${project.id}`, { method: 'DELETE' });
      if (response.ok) setProjects((current) => current.filter((item) => item.id !== project.id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="site-nav">
        <Link href="/" className="brand"><span className="brand-mark">KS</span><span>Kasim Saifi <em>CForge Studio</em></span></Link>
        <nav><Link href="/">Home</Link><button className="nav-button" onClick={() => { void fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/')); }}>Log out</button></nav>
      </header>
      <section className="dashboard-header">
        <div><p className="eyebrow">Kasim Saifi · Your workspace</p><h1>My projects</h1><p className="subtle">Keep every experiment, assignment, and practice program in one place.</p></div>
        <Link href="/editor/new" className="primary-button">＋ New project</Link>
      </section>
      {projects.length === 0 ? (
        <section className="empty-card"><div className="empty-icon">⌘</div><h2>Start your first project</h2><p>Create a C or Node.js program, run it against stdin, and it will appear here automatically.</p><Link href="/editor/new" className="secondary-button">Open the editor</Link></section>
      ) : (
        <section className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-icon">{project.language === 'javascript' ? 'JS' : 'C'}</div>
              <div className="project-content"><h2>{project.title}</h2><p>{project.code.split('\n').find((line) => line.trim())?.slice(0, 90) ?? 'Empty program'}</p><small>Updated {new Date(project.updatedAt).toLocaleDateString()}</small></div>
              <div className="project-actions"><Link href={`/editor/${project.id}`} className="secondary-button small">Open</Link><button className="danger-button" disabled={deleting === project.id} onClick={() => void deleteProject(project)}>{deleting === project.id ? 'Deleting…' : 'Delete'}</button></div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
