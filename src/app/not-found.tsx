import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-6xl">🏉</div>
      <h1 className="mt-4 text-2xl font-bold">Knock-on!</h1>
      <p className="mt-1 text-muted">We couldn&apos;t find that page, or you don&apos;t have access to it.</p>
      <Link href="/" className="mt-4 text-brand underline">Back to home</Link>
    </div>
  );
}
