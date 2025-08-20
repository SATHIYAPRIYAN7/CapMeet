import React, { useState, useEffect } from 'react'
import { Monitor, MonitorSmartphone, ChevronDown, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const SourceSelector = ({ selectedSource, onSourceChange, disabled = false }) => {
  const [sources, setSources] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSources()
  }, [])

  const loadSources = async () => {
    try {
      setIsLoading(true)
      setError(null)
      if (window.api && window.api.getDisplayMedia) {
        const availableSources = await window.api.getDisplayMedia()
        setSources(availableSources || [])
        
        if (availableSources && availableSources.length > 0) {
          // Check if the currently selected source is still available
          const isSelectedSourceAvailable = selectedSource && availableSources.some(source => source.id === selectedSource)
          
          if (!isSelectedSourceAvailable) {
            // If selected source is not available, select the first available source
            const firstSource = availableSources[0]
            console.log('Selected source not available, switching to first available source:', firstSource.label)
            onSourceChange(firstSource.id)
          }
        }
      }
    } catch (error) {
      console.error('Error loading screen sources:', error)
      setError('Failed to load screen sources')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSourceChange = (value) => {
    onSourceChange(value)
  }

  const getSourceIcon = (sourceType) => {
    if (sourceType === 'screen') return <Monitor className="w-4 h-4" />
    if (sourceType === 'window') return <MonitorSmartphone className="w-4 h-4" />
    return <Monitor className="w-4 h-4" />
  }

  const getSourceLabel = (source) => {
    if (source.name === 'Entire Screen') return 'Entire Screen'
    if (source.name === 'Primary Display') return 'Primary Display'
    if (source.name === 'Secondary Display') return 'Secondary Display'
    if (source.name.includes('Screen')) return source.name
    if (source.name.includes('Window')) return `Window: ${source.name}`
    return source.name || 'Unknown Source'
  }

  const getSourceDescription = (source) => {
    if (source.type === 'screen') return 'Full screen capture'
    if (source.type === 'window') return 'Application window'
    return 'Screen or window'
  }

  return (
    <div className="w-1/2 border border-solid border-[#E5E5E5] px-4 pt-3 pb-1 rounded-md h-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Screen Source</label>
        {/* <Button
          variant="ghost"
          size="sm"
          onClick={loadSources}
          disabled={isLoading}
          className="h-6 w-6 p-0 hover:bg-gray-100"
          title="Refresh sources"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button> */}
      </div>
      <Select
        value={selectedSource}
        onValueChange={handleSourceChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none p-0 -mt-2 text-xs focus-visible:ring-0 focus-visible:outline-none">
          <SelectValue placeholder={isLoading ? "Loading sources..." : "Select screen source"} />
        </SelectTrigger>
        <SelectContent className="-mt-2 max-w-96 text-nowrap  overflow-hidden truncate">
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading sources...
            </SelectItem>
          ) : sources.length > 0 ? (
            sources.map((source, index) => (
              <SelectItem
                key={source.id || index}
                value={source.id}
                className="text-xs"
              >
    
                    {/* {getSourceIcon(source.type)} */}
                    {getSourceLabel(source)}
            
                  {/* <span className="text-muted-foreground ml-6">
                    {getSourceDescription(source)}
                  </span> */}
            
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-sources" disabled>
              No screen sources found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      
      {/* {error && (
        <div className="text-xs text-red-500 mt-1 flex items-center gap-2">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSources}
            className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
            title="Retry"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      )} */}
    </div>
  )
}

export default SourceSelector 