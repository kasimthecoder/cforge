import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import CForgeEditor from '../../../components/CForgeEditor';
import { getAuthenticatedUserFromCookieHeader } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

export default async function ExistingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUserFromCookieHeader((await cookies()).toString());
  if (!user) redirect('/?auth=required');
  const { id } = await params;
  const project = await prisma.savedCode.findFirst({ where: { id, userId: user.id }, select: { id: true, title: true, code: true, language: true } });
  if (!project) notFound();
  return <CForgeEditor project={{ ...project, language: project.language === 'javascript' ? 'javascript' : 'c' }} isAuthenticated />;
}
