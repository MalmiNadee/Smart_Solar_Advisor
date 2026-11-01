import React from "react";
import { Link } from "react-router-dom";
import { Sun, Zap, ArrowRight, CheckCircle2, Wrench } from "lucide-react";
import { SolarSite } from "@/types/solar";
import { cn } from "@/lib/utils";

interface SiteCardProps {
  site: SolarSite;
}

const statusConfig = {
  running: {
    label: "Running",
    icon: Zap,
    className: "bg-success/10 text-success border-success/20",
    dotColor: "bg-success",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-muted text-muted-foreground border-border",
    dotColor: "bg-muted-foreground",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    className: "bg-warning/10 text-warning border-warning/20",
    dotColor: "bg-warning",
  },
};

export const SiteCard: React.FC<SiteCardProps> = ({ site }) => {
  const status = statusConfig[site.status] || statusConfig.running;
  const StatusIcon = status.icon;

  return (
    <Link
      to={`/sites/${site.id}`}
      className="group block p-6 rounded-xl bg-card border border-border card-hover animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl gradient-solar flex items-center justify-center">
          <Sun className="w-6 h-6 text-accent-foreground" />
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
            status.className
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              status.dotColor,
              site.status === "running" && "animate-pulse"
            )}
          />
          {status.label}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
        {site.site_name}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{site.customer_name}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">System Size</p>
          <p className="text-sm font-semibold text-foreground">{site.system_kw} kW</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Panels</p>
          <p className="text-sm font-semibold text-foreground">{site.panel_count}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Panel Type</p>
          <p className="text-sm font-semibold text-foreground">{site.panel_type}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Inverter</p>
          <p className="text-sm font-semibold text-foreground">{site.inverter_type}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">
          Device: {site.device_id}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
};
