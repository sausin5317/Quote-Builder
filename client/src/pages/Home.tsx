import { Layout } from "@/components/ui/Layout";
import { LaneSelector } from "@/components/calculator/LaneSelector";
import { CalculatorForm } from "@/components/calculator/CalculatorForm";
import { useState } from "react";
import { Lane } from "@shared/schema";
import { Calculator } from "lucide-react";

export default function Home() {
  const [selectedLane, setSelectedLane] = useState<Lane | null>(null);

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] gap-6">
        
        {/* Mobile: Lane selector opens in drawer or modal, Desktop: Side-by-side */}
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          
          {/* Left Panel: Lane List */}
          <div className="w-full lg:w-80 lg:shrink-0 h-64 lg:h-full">
            <LaneSelector 
              selectedLaneId={selectedLane?.id || null} 
              onSelectLane={setSelectedLane} 
            />
          </div>

          {/* Main Area: Calculator */}
          <div className="flex-1 h-full overflow-y-auto pr-2 pb-10">
            {selectedLane ? (
              <div className="animate-fade-in">
                <CalculatorForm lane={selectedLane} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-8 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                  <Calculator className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Lane Selected</h3>
                <p className="max-w-md mx-auto">Select a lane from the sidebar to start calculating a quote. You can search by origin, destination, or product.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
