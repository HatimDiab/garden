import { EntryForm } from "@/components/editor/EntryForm";
import { saveEntry } from "../actions";

export const metadata = { title: "New entry" };

export default function NewEntryPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-moss-deep">New entry</h1>
      <p className="mt-1 text-sm text-ink-soft">
        A fresh page. Tell today&apos;s story.
      </p>
      <div className="mt-6">
        <EntryForm saveAction={saveEntry} />
      </div>
    </div>
  );
}
