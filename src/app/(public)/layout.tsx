import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { PageTransition } from "@/components/page-transition";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicNav />
      <main className="pt-16 min-h-screen">
        <PageTransition>{children}</PageTransition>
      </main>
      <PublicFooter />
    </>
  );
}
