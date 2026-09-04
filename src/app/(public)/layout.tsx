import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Chatbot } from "@/components/public/Chatbot";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main id="main">{children}</main>
      <PublicFooter />
      {/* Mounted here rather than on the landing page alone so the assistant is
          available on every public page, as the feature list describes. */}
      <Chatbot />
    </div>
  );
}
