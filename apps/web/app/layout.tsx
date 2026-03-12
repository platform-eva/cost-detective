export const metadata = {
  title: "Cost Detective (MVP)",
  description: "K8s Cost/Scaling Lab",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
