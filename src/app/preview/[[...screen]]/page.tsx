import { notFound } from "next/navigation";
import { Postoffice } from "@/components/postoffice";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ screen?: string[] }>;
}) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENABLE_DEV_PREVIEW !== "true"
  )
    notFound();
  const { screen = [] } = await params;
  return <Postoffice preview screen={screen} />;
}
