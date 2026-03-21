const STEPS = [
  {
    number: 1,
    title: 'Consultation',
    description: 'We discuss your vision, placement, size, and style to create a plan.',
  },
  {
    number: 2,
    title: 'Design',
    description: "Your custom design is created and refined until it's exactly right.",
  },
  {
    number: 3,
    title: 'Session',
    description: 'Your tattoo is applied in a clean, comfortable studio environment.',
  },
  {
    number: 4,
    title: 'Aftercare',
    description: 'We provide detailed aftercare instructions for optimal healing.',
  },
] as const;

export function ProcessSteps() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
      {STEPS.map((step, index) => (
        <div key={step.number} className="relative flex flex-col items-center text-center">
          {/* Connecting line on desktop */}
          {index < STEPS.length - 1 && (
            <div className="hidden md:block absolute top-5 left-[calc(50%+24px)] right-[calc(-50%+24px)] border-t-2 border-dashed border-muted-foreground/30" />
          )}

          {/* Step number circle */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm mb-3">
            {step.number}
          </div>

          {/* Step content */}
          <h3 className="font-semibold mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground max-w-[200px]">
            {step.description}
          </p>
        </div>
      ))}
    </div>
  );
}
