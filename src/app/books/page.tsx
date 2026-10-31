import Link from "next/link";
import BooksDashboard from "@/components/books-dashboard";
import { sampleBooks } from "@/lib/books";

export const metadata = { title: "Milchbüechli — byeBills" };

export default function BooksPage() {
  // TODO: load the signed-in user's transactions (Supabase, RLS) instead of sample data.
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FBF4E6" }}>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/" className="mb-8 inline-block text-[18px] font-bold" style={{ color: "#15181D" }}>
          byeBills
        </Link>
        <BooksDashboard data={sampleBooks} isSample />
      </div>
    </div>
  );
}
