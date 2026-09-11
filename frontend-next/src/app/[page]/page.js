import AppScreen from "../app-shell";

export default async function Page({ params }) {
  const { page } = await params;
  return <AppScreen page={page} />;
}