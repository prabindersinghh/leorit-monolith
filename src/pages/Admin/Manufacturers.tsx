import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManufacturerList from "@/components/ManufacturerList";
import AddManufacturerForm from "@/components/AddManufacturerForm";

const Manufacturers = () => {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole="admin" />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Manufacturer Management</h1>
            <p className="text-muted-foreground">Manage and onboard manufacturers</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="list">Manufacturer List</TabsTrigger>
              <TabsTrigger value="add">Add Manufacturer</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <ManufacturerList />
            </TabsContent>

            <TabsContent value="add">
              <AddManufacturerForm onSuccess={() => setActiveTab("list")} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Manufacturers;
