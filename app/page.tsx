export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">Welcome to Cloud SaaS</h1>
        <p className="text-lg text-center sm:text-left">
          A modern SaaS platform built with Next.js, Tailwind CSS, and DaisyUI.
        </p>
        
        <div className="flex gap-4">
          <button className="btn btn-primary">Get Started</button>
          <button className="btn btn-outline">Learn More</button>
        </div>
      </main>
    </div>
  );
}
