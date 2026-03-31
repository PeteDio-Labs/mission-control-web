import { EventFeed } from '@/components/dashboard/EventFeed';

export default function EventsPage() {
  return (
    <article className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-blue-400" />
        Events
      </h1>
      <EventFeed />
    </article>
  );
}
