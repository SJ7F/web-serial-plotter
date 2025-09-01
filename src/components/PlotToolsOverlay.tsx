import { forwardRef, useState, useRef, useEffect } from 'react'
import Button from './ui/Button'
import { PlayIcon, PauseIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, CameraIcon, ArrowDownTrayIcon, CogIcon } from '@heroicons/react/24/outline'
import type { ChartExportOptions } from '../utils/chartExport'

interface Props {
  frozen: boolean
  onToggleFrozen: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onSavePng: () => Promise<void> | void
  onExportCsv: (options: ChartExportOptions) => void
  onShowSettings: () => void
  hasData: boolean
}

const PlotToolsOverlay = forwardRef<HTMLDivElement, Props>(function PlotToolsOverlay({ frozen, onToggleFrozen, onZoomIn, onZoomOut, onSavePng, onExportCsv, onShowSettings, hasData }, ref) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false)
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showExportMenu])
  return (
    <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-auto" ref={ref}>
      <Button size="sm" variant="neutral" aria-label={frozen ? 'Play' : 'Pause'} title={frozen ? 'Play' : 'Pause'} onClick={onToggleFrozen}>
        {frozen ? (
          <PlayIcon className="w-5 h-5" />
        ) : (
          <PauseIcon className="w-5 h-5" />
        )}
      </Button>
      <Button size="sm" variant="neutral" aria-label="Zoom in" title="Zoom in" onClick={onZoomIn}>
        <MagnifyingGlassPlusIcon className="w-5 h-5" />
      </Button>
      <Button size="sm" variant="neutral" aria-label="Zoom out" title="Zoom out" onClick={onZoomOut}>
        <MagnifyingGlassMinusIcon className="w-5 h-5" />
      </Button>
      
      {/* CSV Export Button with Dropdown */}
      <div className="relative" ref={exportMenuRef}>
        <Button 
          size="sm" 
          variant="neutral" 
          aria-label="Export CSV" 
          title="Export CSV" 
          disabled={!hasData}
          onClick={() => setShowExportMenu(!showExportMenu)}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
        </Button>
        
        {showExportMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-md shadow-lg z-10 min-w-48">
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  onExportCsv({ scope: 'visible', includeTimestamps: true, timeFormat: 'iso' })
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
              >
                📊 Export Visible Data
              </button>
              <button
                onClick={() => {
                  onExportCsv({ scope: 'all', includeTimestamps: true, timeFormat: 'iso' })
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
              >
                📈 Export All Data
              </button>
              <div className="border-t border-gray-200 dark:border-neutral-700 my-1" />
              <button
                onClick={() => {
                  onExportCsv({ scope: 'visible', includeTimestamps: true, timeFormat: 'relative' })
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
              >
                ⏱️ Visible (Relative Time)
              </button>
              <button
                onClick={() => {
                  onExportCsv({ scope: 'all', includeTimestamps: true, timeFormat: 'relative' })
                  setShowExportMenu(false)
                }}
                className="w-full text-left px-2 py-1 text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
              >
                ⏱️ All Data (Relative Time)
              </button>
            </div>
          </div>
        )}
      </div>
      
      <Button size="sm" variant="neutral" aria-label="Settings" title="Settings" onClick={onShowSettings}>
        <CogIcon className="w-5 h-5" />
      </Button>

      <Button size="sm" variant="neutral" aria-label="Save PNG" title="Save PNG" onClick={onSavePng}>
        <CameraIcon className="w-5 h-5" />
      </Button>
    </div>
  )
})

export default PlotToolsOverlay


