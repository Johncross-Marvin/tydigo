import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Recycle } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F0FDF4] via-white to-[#DCFCE7] p-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-[#145C25] flex items-center justify-center mx-auto mb-5 shadow-brand">
          <Recycle className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-neutral-900 mb-3">Page not found</h1>
        <p className="text-neutral-500 mb-6">
          This WastiGo route is not available. Head back home or choose your role again.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link to="/">
            <Button className="w-full sm:w-auto bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-xl">
              Return Home
            </Button>
          </Link>
          <Link to="/role-selection">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl">
              Choose Role
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
