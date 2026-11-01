import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sitesAPI } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface CreateSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  onSuccess: () => void;
}

export const CreateSiteDialog: React.FC<CreateSiteDialogProps> = ({
  open,
  onOpenChange,
  customerName,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    siteId: "",
    site_name: "",
    device_id: "",
    system_kw: "",
    panel_type: "",
    panel_count: "",
    inverter_type: "",
    inverter_capacity_kw: "",
    status: "running",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await sitesAPI.create({
        ...formData,
        customer_name: customerName,
        system_kw: parseFloat(formData.system_kw),
        panel_count: parseInt(formData.panel_count),
        inverter_capacity_kw: parseFloat(formData.inverter_capacity_kw),
      });
      toast({
        title: "Success",
        description: "Site created successfully",
      });
      setFormData({
        siteId: "",
        site_name: "",
        device_id: "",
        system_kw: "",
        panel_type: "",
        panel_count: "",
        inverter_type: "",
        inverter_capacity_kw: "",
        status: "running",
      });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create site",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Site</DialogTitle>
          <DialogDescription>
            Create a new solar site for {customerName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteId">Site ID</Label>
              <Input
                id="siteId"
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                placeholder="site_001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site_name">Site Name</Label>
              <Input
                id="site_name"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="device_id">Device ID</Label>
            <Input
              id="device_id"
              value={formData.device_id}
              onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
              placeholder="SSA_ESP32_01"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="system_kw">System Size (kW)</Label>
              <Input
                id="system_kw"
                type="number"
                step="0.1"
                value={formData.system_kw}
                onChange={(e) => setFormData({ ...formData, system_kw: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="panel_count">Panel Count</Label>
              <Input
                id="panel_count"
                type="number"
                value={formData.panel_count}
                onChange={(e) => setFormData({ ...formData, panel_count: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="panel_type">Panel Type</Label>
            <Input
              id="panel_type"
              value={formData.panel_type}
              onChange={(e) => setFormData({ ...formData, panel_type: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inverter_type">Inverter Type</Label>
              <Input
                id="inverter_type"
                value={formData.inverter_type}
                onChange={(e) => setFormData({ ...formData, inverter_type: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inverter_capacity_kw">Inverter Capacity (kW)</Label>
              <Input
                id="inverter_capacity_kw"
                type="number"
                step="0.1"
                value={formData.inverter_capacity_kw}
                onChange={(e) => setFormData({ ...formData, inverter_capacity_kw: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

