"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useToast } from "@/app/components/ui/simple-toast";
import { Label } from "@/app/components/ui/label";
import { Loader2 } from "lucide-react";

type BrandKit = {
  id: string;
  name: string;
  logoPublicId?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
};

type VideoTransformProps = {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  onTransformCreated: (transform: any) => void;
};

const TransformDialog = ({ videoId, isOpen, onClose, onTransformCreated }: VideoTransformProps) => {
  const [transformType, setTransformType] = useState("resize");
  const [brandKits, setBrandKits] = useState<BrandKit[]>([]);
  const [loading, setLoading] = useState(false);
  const [transformName, setTransformName] = useState("");
  const { toast } = useToast();

  // Settings for different transform types
  const [resizeSettings, setResizeSettings] = useState({
    width: 1280,
    height: 720,
    crop: "fill",
  });

  const [socialSettings, setSocialSettings] = useState({
    platform: "instagram",
  });

  const [trimSettings, setTrimSettings] = useState({
    startTime: 0,
    endTime: 0,
  });

  const [watermarkSettings, setWatermarkSettings] = useState({
    text: "",
    fontFamily: "Arial",
    fontSize: 30,
    textColor: "#ffffff",
    position: "south_east",
  });

  const [brandKitSettings, setBrandKitSettings] = useState({
    brandKitId: "",
    position: "south_east",
    logoWidth: 100,
    opacity: 70,
  });

  useEffect(() => {
    // Fetch brand kits when dialog opens
    if (isOpen) {
      fetchBrandKits();
    }
  }, [isOpen]);

  const fetchBrandKits = async () => {
    try {
      const response = await fetch("/api/brand-kits");
      if (response.ok) {
        const data = await response.json();
        setBrandKits(data);
        if (data.length > 0) {
          setBrandKitSettings({
            ...brandKitSettings,
            brandKitId: data[0].id,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching brand kits:", error);
      toast({
        title: "Error",
        description: "Failed to load brand kits",
        variant: "destructive",
      });
    }
  };

  const handleCreateTransform = async () => {
    setLoading(true);
    
    // Prepare settings based on transform type
    let settings;
    switch (transformType) {
      case "resize":
        settings = resizeSettings;
        break;
      case "social":
        settings = socialSettings;
        break;
      case "trim":
        settings = trimSettings;
        break;
      case "watermark":
        settings = watermarkSettings;
        break;
      case "brandKit":
        settings = brandKitSettings;
        break;
      default:
        settings = {};
    }
    
    try {
      const response = await fetch("/api/video-transforms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          name: transformName || `${transformType} ${new Date().toLocaleDateString()}`,
          transformType,
          settings,
          brandKitId: transformType === "brandKit" ? brandKitSettings.brandKitId : undefined,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: "Video transform created successfully",
        });
        onTransformCreated(data);
        onClose();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create transform",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating transform:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Video Transform</DialogTitle>
          <DialogDescription>
            Create a new version of your video with different settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="transform-name">Transform Name</Label>
            <Input
              id="transform-name"
              placeholder="My video transform"
              value={transformName}
              onChange={(e) => setTransformName(e.target.value)}
            />
          </div>
          
          <Tabs defaultValue="resize" onValueChange={(value) => setTransformType(value)}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="resize">Resize</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="trim">Trim</TabsTrigger>
              <TabsTrigger value="watermark">Watermark</TabsTrigger>
              <TabsTrigger value="brandKit">Brand Kit</TabsTrigger>
            </TabsList>
            
            <TabsContent value="resize" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={resizeSettings.width}
                    onChange={(e) => setResizeSettings({...resizeSettings, width: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={resizeSettings.height}
                    onChange={(e) => setResizeSettings({...resizeSettings, height: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="crop">Crop Method</Label>
                <Select
                  value={resizeSettings.crop}
                  onValueChange={(value) => setResizeSettings({...resizeSettings, crop: value})}
                >
                  <SelectTrigger id="crop">
                    <SelectValue placeholder="Select crop method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fill">Fill</SelectItem>
                    <SelectItem value="crop">Crop</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                    <SelectItem value="pad">Pad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="social" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select
                  value={socialSettings.platform}
                  onValueChange={(value) => setSocialSettings({...socialSettings, platform: value})}
                >
                  <SelectTrigger id="platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram (1:1)</SelectItem>
                    <SelectItem value="tiktok">TikTok (9:16)</SelectItem>
                    <SelectItem value="youtube">YouTube (16:9)</SelectItem>
                    <SelectItem value="facebook">Facebook (16:9)</SelectItem>
                    <SelectItem value="twitter">Twitter (16:9)</SelectItem>
                    <SelectItem value="linkedin">LinkedIn (1.91:1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="trim" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time (seconds)</Label>
                  <Input
                    id="start-time"
                    type="number"
                    value={trimSettings.startTime}
                    onChange={(e) => setTrimSettings({...trimSettings, startTime: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time (seconds)</Label>
                  <Input
                    id="end-time"
                    type="number"
                    value={trimSettings.endTime}
                    onChange={(e) => setTrimSettings({...trimSettings, endTime: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="watermark" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="watermark-text">Watermark Text</Label>
                <Input
                  id="watermark-text"
                  placeholder="© My Company"
                  value={watermarkSettings.text}
                  onChange={(e) => setWatermarkSettings({...watermarkSettings, text: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="font-family">Font Family</Label>
                  <Select
                    value={watermarkSettings.fontFamily}
                    onValueChange={(value) => setWatermarkSettings({...watermarkSettings, fontFamily: value})}
                  >
                    <SelectTrigger id="font-family">
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Courier">Courier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="font-size">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    value={watermarkSettings.fontSize}
                    onChange={(e) => setWatermarkSettings({...watermarkSettings, fontSize: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="text-color">Text Color</Label>
                  <Input
                    id="text-color"
                    type="color"
                    value={watermarkSettings.textColor}
                    onChange={(e) => setWatermarkSettings({...watermarkSettings, textColor: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={watermarkSettings.position}
                    onValueChange={(value) => setWatermarkSettings({...watermarkSettings, position: value})}
                  >
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north_west">Top Left</SelectItem>
                      <SelectItem value="north">Top Center</SelectItem>
                      <SelectItem value="north_east">Top Right</SelectItem>
                      <SelectItem value="west">Center Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="east">Center Right</SelectItem>
                      <SelectItem value="south_west">Bottom Left</SelectItem>
                      <SelectItem value="south">Bottom Center</SelectItem>
                      <SelectItem value="south_east">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="brandKit" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-kit">Brand Kit</Label>
                <Select
                  value={brandKitSettings.brandKitId}
                  onValueChange={(value) => setBrandKitSettings({...brandKitSettings, brandKitId: value})}
                >
                  <SelectTrigger id="brand-kit">
                    <SelectValue placeholder="Select brand kit" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandKits.map((kit) => (
                      <SelectItem key={kit.id} value={kit.id}>
                        {kit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="logo-position">Logo Position</Label>
                  <Select
                    value={brandKitSettings.position}
                    onValueChange={(value) => setBrandKitSettings({...brandKitSettings, position: value})}
                  >
                    <SelectTrigger id="logo-position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="north_west">Top Left</SelectItem>
                      <SelectItem value="north">Top Center</SelectItem>
                      <SelectItem value="north_east">Top Right</SelectItem>
                      <SelectItem value="west">Center Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="east">Center Right</SelectItem>
                      <SelectItem value="south_west">Bottom Left</SelectItem>
                      <SelectItem value="south">Bottom Center</SelectItem>
                      <SelectItem value="south_east">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-width">Logo Width</Label>
                  <Input
                    id="logo-width"
                    type="number"
                    value={brandKitSettings.logoWidth}
                    onChange={(e) => setBrandKitSettings({...brandKitSettings, logoWidth: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-opacity">Opacity (%)</Label>
                  <Input
                    id="logo-opacity"
                    type="number"
                    min="0"
                    max="100"
                    value={brandKitSettings.opacity}
                    onChange={(e) => setBrandKitSettings({...brandKitSettings, opacity: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateTransform} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Transform
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransformDialog;
