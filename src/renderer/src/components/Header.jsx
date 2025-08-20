import { LogOut, Settings } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import capmeetLogo from '@/assets/capmeetLogo.png'
import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";

export const Header = ({handleLogout,userData}) => {
  
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
        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center font-semibold border border-gray-400 cursor-pointer">
           {userData?.name[0] || ''}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 mr-6 group">
      <DropdownMenuItem className="flex flex-col justify-start items-start pointer-events-none ">
       <p className="text-sm font-semibold -mb-2">{userData?.name ||"UserName"}</p>
       <p className="text-xs text-gray-400 font-light">{userData?.email || "Usermail@gmail.com"}</p>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="h-px bg-gray-300 mb-1" />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:text-red-500 hover:bg-red-100 ">
         <span className="hover:text-red-500 flex items-center gap-1.5"><LogOut className="w-4 h-4 mr-1 hover:text-red-500" /> Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};