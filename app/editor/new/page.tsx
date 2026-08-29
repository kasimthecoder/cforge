import { cookies } from 'next/headers';
import CForgeEditor from '../../../components/CForgeEditor';
import { getAuthenticatedUserFromCookieHeader } from '../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function NewEditorPage() {
  const user = await getAuthenticatedUserFromCookieHeader((await cookies()).toString());
  return <CForgeEditor isAuthenticated={Boolean(user)} />;
}
