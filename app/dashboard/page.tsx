import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProjectDashboard from '../../components/ProjectDashboard';
import { getAuthenticatedUserFromCookieHeader } from '../lib/auth';
import { prisma } from '../lib/prisma';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getAuthenticatedUserFromCookieHeader((await cookies()).toString());
  if (!user) redirect('/?auth=required');

  const projects = await prisma.savedCode.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, code: true, createdAt: true, updatedAt: true },
  });

  return <ProjectDashboard projects={projects.map((project) => ({ ...project, createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString() }))} />;
}
