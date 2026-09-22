import { CategoryChat } from "@/components/category-chat";
import { PageHeader } from "@/components/ui/page-header";

export default function CrossMeetingChatPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Ask"
        title="Chat across a category"
        description="Each category bundles related calls — pick one and ask Tandem anything across the whole series. For a single meeting, open it and use the Ask Tandem tab."
      />
      <CategoryChat />
    </div>
  );
}
