import { LogOut, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import capmeetLogo from '@/assets/capmeetLogo.png'

export const Header = ({handleLogout}) => {
  
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center space-x-2">
      <img src={capmeetLogo} alt="logo" className="w-7 mt-1" />
        <div className="flex items-center space-x-2">
          <span className="text-xl font-semibold text-foreground">CapMeet</span>
          <span className="text-xs text-muted-foreground rounded mt-1.5">v0.1.0</span>
        </div>
      </div>
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
      <Settings className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40 mr-6 group">
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:text-red-500 group-hover:bg-red-100 ">
        <LogOut className="w-4 h-4 mr-1 group-hover:text-red-500" /> <span className="group-hover:text-red-500">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};