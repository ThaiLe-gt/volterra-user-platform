import { TwinProvider, TwinView } from "@/features/digital-twin";

export default async function DigitalTwinPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  return (
    <TwinProvider>
      <TwinView siteId={siteId} />
    </TwinProvider>
  );
}
