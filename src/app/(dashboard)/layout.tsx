export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <h2 className="font-semibold">Ink37 Admin</h2>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
