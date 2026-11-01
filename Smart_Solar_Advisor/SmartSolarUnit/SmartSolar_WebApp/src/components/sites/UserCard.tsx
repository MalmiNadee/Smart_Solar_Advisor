import React from "react";
import { User, Mail, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserCardProps {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  onClick: () => void;
  isSelected?: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onClick, isSelected }) => {
  const isAdmin = user.role === "admin";

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-6 rounded-xl bg-card border-2 cursor-pointer transition-all animate-fade-in",
        isSelected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/50 hover:bg-accent/5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <Shield className="w-3 h-3" />
            Admin
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
        {user.name}
      </h3>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="w-4 h-4" />
        <span>{user.email}</span>
      </div>
    </div>
  );
};

