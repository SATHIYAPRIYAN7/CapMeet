import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SourceSelector = ({ sources, selectedSourceId, onSourceChange, isLoading }) => {
  if (isLoading) {
    return (
      <div className="border border-solid border-[#E5E5E5] px-4 py-3 rounded-md">
        <label className="text-sm font-medium text-foreground">Screen Source</label>
        <div className="text-xs text-muted-foreground mt-1">Loading sources...</div>
      </div>
    )
  }

  if (sources.length === 0) {
    return (
      <div className="border border-solid border-[#E5E5E5] px-4 py-3 rounded-md">
        <label className="text-sm font-medium text-foreground">Screen Source</label>
        <div className="text-xs text-muted-foreground mt-1">No sources available</div>
      </div>
    )
  }

  return (
    <div className="border border-solid border-[#E5E5E5] px-4 pt-2 pb-1 rounded-md">
      <label className="text-sm font-medium text-foreground">Screen Source</label>
      <Select value={selectedSourceId || ''} onValueChange={onSourceChange}>
        <SelectTrigger className="w-full border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 -mt-2 text-xs focus-visible:ring-0 focus-visible:outline-none">
          <SelectValue placeholder="Select a screen or window" />
        </SelectTrigger>
        <SelectContent className="-mt-2">
          {sources.map((source) => (
            <SelectItem key={source.id} value={source.id}>
              <div className="flex items-center space-x-2">
                {source.thumbnail && (
                  <img 
                    src={source.thumbnail.toDataURL()} 
                    alt={source.name}
                    className="w-4 h-4 rounded"
                  />
                )}
                <span>{source.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default SourceSelector 