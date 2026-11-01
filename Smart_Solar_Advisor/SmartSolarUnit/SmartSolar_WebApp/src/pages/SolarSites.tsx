import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SiteCard } from "@/components/sites/SiteCard";
import { UserCard } from "@/components/sites/UserCard";
import { CreateUserDialog } from "@/components/sites/CreateUserDialog";
import { CreateSiteDialog } from "@/components/sites/CreateSiteDialog";
import { UpdateSiteDialog } from "@/components/sites/UpdateSiteDialog";
import { DeleteSiteDialog } from "@/components/sites/DeleteSiteDialog";
import { useSolarSites } from "@/hooks/useBackendAPI";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Sun, UserPlus, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SolarSite } from "@/types/solar";

const SolarSites: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const { users, loading: usersLoading, refetch: refetchUsers } = useUsers();
  const { sites, loading: sitesLoading, error: sitesError } = useSolarSites();
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [updateSiteOpen, setUpdateSiteOpen] = useState(false);
  const [deleteSiteOpen, setDeleteSiteOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SolarSite | null>(null);

  // Helper function to get customer_name from user email
  const getCustomerName = (email: string) => {
    // Extract the part before @ and replace dots/underscores with underscores
    return email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  };

  // For site owners, automatically select their own user and show their sites
  useEffect(() => {
    if (!isAdmin && user && !selectedUser) {
      // Auto-select the logged-in user for site owners
      setSelectedUser({
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0],
        role: 'site_owner'
      });
    }
  }, [isAdmin, user]);

  // Filter sites by selected user (or logged-in user for site owners)
  const userSites = selectedUser
    ? sites.filter((site) => site.customer_name === getCustomerName(selectedUser.email))
    : (!isAdmin && user
        ? sites.filter((site) => site.customer_name === getCustomerName(user.email))
        : []);

  const handleUserClick = (user: { id: string; email: string; name: string; role: string }) => {
    setSelectedUser(user);
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
  };

  const handleCreateSite = () => {
    if (selectedUser) {
      setCreateSiteOpen(true);
    }
  };

  const handleEditSite = (site: SolarSite) => {
    setSelectedSite(site);
    setUpdateSiteOpen(true);
  };

  const handleDeleteSite = (site: SolarSite) => {
    setSelectedSite(site);
    setDeleteSiteOpen(true);
  };

  const handleSuccess = () => {
    // Refetch data after successful operations
    refetchUsers();
  };

  // Show users view (only for admins)
  if (!selectedUser && isAdmin) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Users & Sites</h1>
              <p className="text-muted-foreground">
                Select a user to view and manage their solar sites
              </p>
            </div>
            {isAdmin && (
              <Button onClick={() => setCreateUserOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Create User
              </Button>
            )}
          </div>

          {/* Users Grid */}
          {usersLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border">
              <Sun className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">No Users Found</h2>
              <p className="text-muted-foreground text-center max-w-md mb-4">
                {isAdmin
                  ? "Create your first user to start managing solar sites."
                  : "No users available."}
              </p>
              {isAdmin && (
                <Button onClick={() => setCreateUserOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create First User
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onClick={() => handleUserClick(user)}
                  isSelected={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Create User Dialog */}
        {isAdmin && (
          <CreateUserDialog
            open={createUserOpen}
            onOpenChange={setCreateUserOpen}
            onSuccess={handleSuccess}
          />
        )}
      </DashboardLayout>
    );
  }

  // For site owners, use userSites which already handles the filtering
  const displaySites = userSites;

  // Show sites view for selected user or logged-in site owner
  const runningSites = displaySites.filter((s) => s.status === "running");
  const completedSites = displaySites.filter((s) => s.status === "completed");
  const maintenanceSites = displaySites.filter((s) => s.status === "maintenance");

  // Show sites view if user is selected OR if site owner is logged in
  if (selectedUser || (!isAdmin && user)) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {isAdmin && selectedUser && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleBackToUsers}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isAdmin && selectedUser ? `${selectedUser.name}'s Sites` : 'My Solar Sites'}
                </h1>
                <p className="text-muted-foreground">
                  {selectedUser?.email || user?.email || ''}
                </p>
              </div>
            </div>
            {isAdmin && selectedUser && (
              <Button onClick={handleCreateSite}>
                <Plus className="w-4 h-4 mr-2" />
                Create Site
              </Button>
            )}
          </div>

        {/* Sites Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10">
            <Sun className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">
              {runningSites.length} Running
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted">
            <Sun className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {completedSites.length} Completed
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning/10">
            <Sun className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium text-warning">
              {maintenanceSites.length} Maintenance
            </span>
          </div>
        </div>

        {/* Sites Grid */}
        {sitesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : sitesError ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border">
            <Sun className="w-16 h-16 text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Error Loading Sites</h2>
            <p className="text-muted-foreground">{sitesError}</p>
          </div>
        ) : displaySites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-border">
            <Sun className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">No Solar Sites</h2>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              No solar installations found for this user.
            </p>
            {isAdmin && (
              <Button onClick={handleCreateSite}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Site
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Running Systems */}
            {runningSites.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <h2 className="text-lg font-semibold text-foreground">Running Systems</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {runningSites.map((site) => (
                    <div key={site.id} className="relative group">
                      <SiteCard site={site} />
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditSite(site);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteSite(site);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Maintenance Systems */}
            {maintenanceSites.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <h2 className="text-lg font-semibold text-foreground">Under Maintenance</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {maintenanceSites.map((site) => (
                    <div key={site.id} className="relative group">
                      <SiteCard site={site} />
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditSite(site);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteSite(site);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Systems */}
            {completedSites.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-foreground">Completed Systems</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedSites.map((site) => (
                    <div key={site.id} className="relative group">
                      <SiteCard site={site} />
                      {isAdmin && (
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleEditSite(site);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteSite(site);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      {isAdmin && (
        <>
          <CreateUserDialog
            open={createUserOpen}
            onOpenChange={setCreateUserOpen}
            onSuccess={handleSuccess}
          />
          {selectedUser && (
            <CreateSiteDialog
              open={createSiteOpen}
              onOpenChange={setCreateSiteOpen}
              customerName={getCustomerName(selectedUser.email)}
              onSuccess={handleSuccess}
            />
          )}
          <UpdateSiteDialog
            open={updateSiteOpen}
            onOpenChange={setUpdateSiteOpen}
            site={selectedSite}
            onSuccess={handleSuccess}
          />
          <DeleteSiteDialog
            open={deleteSiteOpen}
            onOpenChange={setDeleteSiteOpen}
            site={selectedSite}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </DashboardLayout>
    );
  }

  // Fallback: should not reach here, but return null for safety
  return null;
};

export default SolarSites;
