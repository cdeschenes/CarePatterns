import PageHeader from '@/components/layout/PageHeader'
import ThemeSelector from '@/components/themes/ThemeSelector'

function GitHubIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5 flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.52 11.52 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export default function Settings() {
  return (
    <div>
      <PageHeader title="Settings" />

      <div className="px-4 py-4 space-y-6">
        {/* About section */}
        <section>
          <h2 className="text-xs font-semibold text-cp-text-muted uppercase tracking-wide mb-3">
            About
          </h2>
          <div className="rounded-xl border border-cp-border bg-cp-surface divide-y divide-cp-border">
            {/* Version row */}
            <div className="px-4 py-3 flex items-center justify-between min-h-[44px]">
              <span className="text-sm text-cp-text">Version</span>
              <span className="text-sm text-cp-text-muted font-mono">
                v{__APP_VERSION__}
              </span>
            </div>

            {/* GitHub row */}
            <a
              href="https://github.com/cdeschenes/CarePatterns"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 flex items-center justify-between min-h-[44px] active:bg-cp-bg transition-colors"
              aria-label="View CarePatterns source on GitHub"
            >
              <span className="text-sm text-cp-text">Source on GitHub</span>
              <div className="flex items-center gap-2 text-cp-text-muted">
                <GitHubIcon />
              </div>
            </a>
          </div>
        </section>

        {/* Appearance section */}
        <section>
          <h2 className="text-xs font-semibold text-cp-text-muted uppercase tracking-wide mb-3">
            Appearance
          </h2>
          <ThemeSelector />
        </section>
      </div>
    </div>
  )
}
