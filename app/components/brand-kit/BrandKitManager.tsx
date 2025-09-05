"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { useToast } from "@/app/components/ui/simple-toast";
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react";

type BrandKit = {
  id: string;
  name: string;
  logoPublicId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  createdAt: string;
};

export default function BrandKitManager() {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<BrandKit | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPublicId, setLogoPublicId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch brand kits
  useEffect(() => {
    fetchBrandKits();
  }, []);

  const fetchBrandKits = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/brand-kits");
      if (response.ok) {
        const data = await response.json();
        setBrandKits(data);
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to load brand kits", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error fetching brand kits:", error);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingKit(null);
    setName("");
    setPrimaryColor("#4f46e5");
    setSecondaryColor("#ffffff");
    setFontFamily("Inter");
    setLogoFile(null);
    setLogoUrl("");
    setLogoPublicId("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (kit: BrandKit) => {
    setEditingKit(kit);
    setName(kit.name);
    setPrimaryColor(kit.primaryColor || "#4f46e5");
    setSecondaryColor(kit.secondaryColor || "#ffffff");
    setFontFamily(kit.fontFamily || "Inter");
    setLogoPublicId(kit.logoPublicId || "");
    setLogoUrl(""); // Will be populated from Cloudinary if needed
    setLogoFile(null);
    setIsDialogOpen(true);
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const response = await fetch(`/api/brand-kits?id=${deleteId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast({ 
          title: "Success", 
          description: "Brand kit deleted successfully"
        });
        fetchBrandKits();
      } else {
        const error = await response.json();
        toast({ 
          title: "Error", 
          description: error.error || "Failed to delete brand kit", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error deleting brand kit:", error);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      // Create a preview URL
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) {
      return logoPublicId || null; // Return existing ID if no new file
    }
    
    const formData = new FormData();
    formData.append("file", logoFile);
    
    try {
      const response = await fetch("/api/brand-kits/upload-logo", {
        method: "POST",
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.publicId;
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to upload logo", 
          variant: "destructive" 
        });
        return null;
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({ 
        title: "Error", 
        description: "Failed to upload logo", 
        variant: "destructive" 
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // First upload the logo if one is selected
      const uploadedLogoId = await uploadLogo();
      
      const brandKitData = {
        name,
        primaryColor,
        secondaryColor,
        fontFamily,
        logoPublicId: uploadedLogoId,
      };
      
      let response;
      
      if (editingKit) {
        // Update existing brand kit
        response = await fetch("/api/brand-kits", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingKit.id,
            ...brandKitData,
          }),
        });
      } else {
        // Create new brand kit
        response = await fetch("/api/brand-kits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(brandKitData),
        });
      }
      
      if (response.ok) {
        toast({ 
          title: "Success", 
          description: `Brand kit ${editingKit ? "updated" : "created"} successfully` 
        });
        setIsDialogOpen(false);
        fetchBrandKits();
      } else {
        const error = await response.json();
        toast({ 
          title: "Error", 
          description: error.error || `Failed to ${editingKit ? "update" : "create"} brand kit`, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error saving brand kit:", error);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Brand Kits</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Brand Kit
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : brandKits.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-lg text-muted-foreground mb-4">No brand kits found</p>
          <Button onClick={openCreateDialog}>Create Your First Brand Kit</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brandKits.map((kit) => (
            <div key={kit.id} className="border rounded-lg overflow-hidden bg-card">
              <div 
                className="h-32 flex items-center justify-center" 
                style={{ backgroundColor: kit.primaryColor || "#f3f4f6" }}
              >
                {kit.logoPublicId ? (
                  <img 
                    src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${kit.logoPublicId}`}
                    alt={kit.name}
                    className="max-h-24 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-2xl font-bold text-white">{kit.name.substring(0, 2).toUpperCase()}</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg">{kit.name}</h3>
                <div className="flex mt-2 gap-2">
                  {kit.primaryColor && (
                    <div 
                      className="h-6 w-6 rounded-full border" 
                      style={{ backgroundColor: kit.primaryColor }}
                      title="Primary Color"
                    />
                  )}
                  {kit.secondaryColor && (
                    <div 
                      className="h-6 w-6 rounded-full border" 
                      style={{ backgroundColor: kit.secondaryColor }}
                      title="Secondary Color"
                    />
                  )}
                  {kit.fontFamily && (
                    <div className="text-sm text-muted-foreground">{kit.fontFamily}</div>
                  )}
                </div>
                <div className="flex justify-end mt-4 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(kit)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => confirmDelete(kit.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingKit ? "Edit Brand Kit" : "Create Brand Kit"}</DialogTitle>
            <DialogDescription>
              {editingKit ? "Update your brand kit settings." : "Create a new brand kit to style your videos."}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Kit Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Brand"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <div className="flex items-center gap-4">
                {(logoUrl || logoPublicId) && (
                  <div className="h-16 w-16 border rounded flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                    ) : logoPublicId ? (
                      <img 
                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${logoPublicId}`} 
                        alt="Current logo" 
                        className="max-h-full max-w-full object-contain" 
                      />
                    ) : null}
                  </div>
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <Input
                id="fontFamily"
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                placeholder="Inter, Arial, sans-serif"
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingKit ? "Update Brand Kit" : "Create Brand Kit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this brand kit? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
