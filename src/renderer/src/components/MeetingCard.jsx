import { Info } from 'lucide-react'

/* eslint-disable react/prop-types */
export const MeetingCard = ({isSingleCard, title, time, status, failed, isEmpty }) => {
  return (
    <div className={`flex items-end justify-between p-3 rounded-lg border border-border bg-gray-50 mt-1 ${isSingleCard ? 'w-full' : 'min-w-[380px]'}`}>
      <div className="flex-1">
        <h3 className="text-sm font-medium text-foreground max-w-64 overflow-hidden text-ellipsis whitespace-nowrap">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
      </div>
      <div className="flex items-end flex-col gap-0.5">
        {failed && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            Saved to downloads <Info className="size-2.5 cursor-pointer hover:text-black" />
          </p>
        )}
        { !isEmpty && <div className={`px-3 py-0.5 text-xs font-medium rounded-full border  ${status === 'Available' ? 'bg-green-100 text-green-800 border-green-500/20' : status === 'Uploading' ? 'bg-yellow-100 text-yellow-800 border-yellow-500/20' : status === 'Processing' ? 'bg-blue-100 text-blue-800 border-blue-500/20' : 'bg-red-100 text-red-800 border-red-500/20'}`}>
          {status}
        </div>}
      </div>
    </div>
  )
}
