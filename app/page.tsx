import { redirect } from 'next/navigation';

export default function Home() {
  console.log('[Home Page] Redirecting to /login');
  redirect('/login');
}
