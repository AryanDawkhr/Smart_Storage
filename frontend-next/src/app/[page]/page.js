import LegacyScreen from "../legacy-screen";

export default async function Page({ params }) {
  const { page } = await params;
  return <LegacyScreen page={page} />;
}