import type { Metadata } from "next";
import AdminGuestbook from "@/components/AdminGuestbook";

export const metadata: Metadata = { title: "Guestbook moderation · Pip’s Dream Workshop", robots: { index: false, follow: false } };

export default function Page() {
  return <main id="top"><AdminGuestbook /></main>;
}
