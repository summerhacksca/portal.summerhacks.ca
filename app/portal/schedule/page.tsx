import { ScheduleView } from "@/components/portal/ScheduleView";
import { getSchedule } from "@/lib/portal/queries";

export default async function SchedulePage() {
	const events = await getSchedule();

	return (
		<main className="mx-auto flex w-full max-w-[1160px] flex-col gap-7 px-9 py-8 pb-20">
			<ScheduleView events={events} />
		</main>
	);
}
