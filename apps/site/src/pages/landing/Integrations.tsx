import { siGithub, siLinear, siSlack } from 'simple-icons';

const tools = [
  { name: 'GitHub', path: siGithub.path },
  { name: 'Linear', path: siLinear.path },
  { name: 'Slack', path: siSlack.path },
];

export function Integrations() {
  return (
    <section id="integrations" className="border-t border-line py-24 md:py-32">
      <div className="container-x">
        <div className="relative flex items-center justify-center gap-10 sm:gap-20">
          <div
            data-i="line"
            className="absolute inset-x-16 top-1/2 h-px origin-left bg-line-strong sm:inset-x-32"
            aria-hidden="true"
          />
          {tools.map((tool) => (
            <div
              key={tool.name}
              data-i="mark"
              className="relative flex flex-col items-center gap-3"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-ink" aria-label={tool.name}>
                  <title>{tool.name}</title>
                  <path d={tool.path} />
                </svg>
              </span>
              <p className="font-mono text-[11px] text-ink-faint">{tool.name}</p>
            </div>
          ))}
        </div>
        <p
          data-i="caption"
          className="mx-auto mt-12 max-w-[40ch] text-center leading-relaxed text-ink-muted"
        >
          Crux augments your stack. It doesn't replace it.
        </p>
      </div>
    </section>
  );
}
