import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Linkedin, Facebook, Instagram, Share2, Twitter } from "lucide-react";
import { PUBLIC_SITE } from "@/lib/site";

export default function ShareJobLink({ jobId, title }: { jobId: string; title: string }) {
  const url = `${PUBLIC_SITE}/apply/${jobId}`;
  const text = `We're hiring: ${title}. Apply here:`;
  const enc = encodeURIComponent;
  const copy = async (msg = "Job link copied") => {
    try { await navigator.clipboard.writeText(url); toast.success(msg); } catch { toast.error("Couldn't copy — select the link manually."); }
  };
  const nativeShare = async () => {
    if (navigator.share) { try { await navigator.share({ title, text, url }); } catch { /* cancelled */ } }
    else copy();
  };

  return (
    <div className="mt-4 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">Share this job — applicants land straight in this job's pipeline</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Job application link" />
        <Button variant="outline" className="gap-2" onClick={() => copy()}><Copy className="h-4 w-4" /> Copy link</Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary" className="gap-2"><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4" /> LinkedIn</a></Button>
        <Button asChild size="sm" variant="secondary" className="gap-2"><a href={`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer"><Twitter className="h-4 w-4" /> X</a></Button>
        <Button asChild size="sm" variant="secondary" className="gap-2"><a href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`} target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4" /> Facebook</a></Button>
        <Button asChild size="sm" variant="secondary" className="gap-2"><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" onClick={() => { void copy("Link copied — Instagram is opening. Paste it into your bio, story link sticker or post caption."); }}><Instagram className="h-4 w-4" /> Instagram</a></Button>
        <Button size="sm" variant="secondary" className="gap-2" onClick={nativeShare}><Share2 className="h-4 w-4" /> More</Button>
      </div>
    </div>
  );
}
