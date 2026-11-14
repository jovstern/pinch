import { Button } from "./ui/Button.tsx";

// What shows instead of the app when the page's strings can't be fetched (design §16.3): offline
// mid-load, or a deploy that replaced their chunk. With no strings there is no t(), so it is fixed
// text, in both languages, each marked with its own.
export function AppDidntLoad() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-balance">
        <span lang="en" dir="ltr" className="block">
          Pinch didn't load. Check your connection, then reload.
        </span>
        <span lang="he" dir="rtl" className="mt-2 block">
          Pinch לא נטען. כדאי לבדוק את החיבור ולטעון מחדש.
        </span>
      </h1>
      <Button
        className="mt-6"
        onClick={() => {
          location.reload();
        }}
      >
        <span lang="en">Reload</span> · <span lang="he">לטעון מחדש</span>
      </Button>
    </main>
  );
}
