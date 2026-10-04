import './style.css';
export const metadata = { title: 'UsageFlow — design studies', robots: { index: false, follow: false } };
export default function Layout({children}: {children: React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
