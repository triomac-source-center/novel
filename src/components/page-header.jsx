import { cn } from "@/lib/utils"

export function PageHeader({ eyebrow, icon: Icon, title, description, actions, className }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
