import './App.css'
import Header from './components/Header'
import ThemeToggle from './components/ThemeToggle'
import ScaleToolbar from './components/ScaleToolbar'
import PlotCanvas, { type PlotCanvasHandle } from './components/PlotCanvas'
// GeneratorPanel removed - now integrated into connect modal
import StatsPanel from './components/StatsPanel'
import { useCallback, useRef, useState } from 'react'
import { useDataConnection } from './hooks/useDataConnection'
import { useDataStore } from './store/dataStore'
import { useConsoleStore } from './hooks/useConsoleStore'
import Legend from './components/Legend'
// icons used within PlotToolsOverlay; no direct use here
import { captureElementPng, downloadDataUrlPng } from './utils/screenshot'
import PlotToolsOverlay from './components/PlotToolsOverlay'
import TabNav from './components/TabNav'
import SerialConsole from './components/SerialConsole'
import Footer from './components/Footer'
import { exportChartData, type ChartExportOptions } from './utils/chartExport'

function App() {
  const store = useDataStore()
  const consoleStore = useConsoleStore()
  const [lastLine, setLastLine] = useState<string>('')
  const [autoscale, setAutoscale] = useState(true)
  const [manualMinInput, setManualMinInput] = useState('-1')
  const [manualMaxInput, setManualMaxInput] = useState('1')
  const [timeMode, setTimeMode] = useState<'absolute' | 'relative'>('absolute')
  const [activeTab, setActiveTab] = useState<'chart' | 'console'>('chart')

  const handleIncomingLine = useCallback((line: string) => {
    setLastLine(line)
    
    // Send to console store (always log all incoming data)
    consoleStore.addIncoming(line)
    
    // Parse for chart (existing logic)
    if (line.trim().startsWith('#')) {
      const names = line.replace(/^\s*#+\s*/, '').split(/[\s,\t]+/).filter(Boolean)
      if (names.length > 0) store.setSeries(names)
      return
    }
    const parts = line.trim().split(/[\s,\t]+/).filter(Boolean)
    if (parts.length === 0) return
    const values: number[] = []
    for (const p of parts) {
      const v = Number(p)
      if (Number.isFinite(v)) values.push(v)
    }
    if (values.length > 0) store.append(values)
  }, [store, consoleStore])

  const dataConnection = useDataConnection(handleIncomingLine)

  const canvasRef = useRef<PlotCanvasHandle | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const plotContainerRef = useRef<HTMLDivElement | null>(null)
  const toolsRef = useRef<HTMLDivElement | null>(null)
  const [statsHeightPx, setStatsHeightPx] = useState(240)

  // Compute a single viewport snapshot per render to reuse across sections
  const snap = store.getViewPortData()

  const startDragResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const onMove = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      let h = rect.bottom - ev.clientY
      const min = 120
      const max = Math.max(min, rect.height - 120)
      h = Math.max(min, Math.min(max, h))
      setStatsHeightPx(h)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [setStatsHeightPx])

  const handleExportCsv = useCallback((options: ChartExportOptions) => {
    exportChartData(snap, store, options)
  }, [snap, store])

  return (
    <div className="h-dvh flex flex-col bg-white text-gray-900 dark:bg-neutral-950 dark:text-neutral-100 overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800">
        <Header
          connectionState={dataConnection.state}
          onConnectSerial={dataConnection.connectSerial}
          onConnectGenerator={dataConnection.connectGenerator}
          onDisconnect={dataConnection.disconnect}
          generatorConfig={dataConnection.generatorConfig}
        />
        <div className="pr-4">
          <ThemeToggle />
        </div>
      </div>

      <main className="flex-1 w-full px-4 py-3 flex flex-col gap-3 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div />
          <ScaleToolbar
            autoscale={autoscale}
            manualMinInput={manualMinInput}
            manualMaxInput={manualMaxInput}
            capacity={store.getCapacity()}
            timeMode={timeMode}
            onChange={{
              setAutoscale,
              setManualMinInput,
              setManualMaxInput,
              setCapacity: (v) => store.setCapacity(v),
              setTimeMode,
            }}
          />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Tab Navigation */}
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* Tab Content */}
          {activeTab === 'chart' ? (
            <div
              className="flex-1 min-h-0 grid"
              ref={containerRef}
              style={{ gridTemplateRows: `minmax(0,1fr) 6px ${statsHeightPx}px` }}
            >
              <div className="relative w-full h-full" ref={plotContainerRef}>
                <PlotCanvas
                  ref={canvasRef}
                  snapshot={snap}
                  yOverride={(() => {
                    if (autoscale) return null
                    const min = parseFloat(manualMinInput)
                    const max = parseFloat(manualMaxInput)
                    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max }
                    return null
                  })()} timeMode={timeMode}
                  onPanStart={() => {
                    store.stopMomentum()
                    if (!store.getFrozen()) {
                      store.setFrozen(true)
                    }
                  }}
                  onPanDelta={(delta) => {
                    store.setViewPortCursor(store.getViewPortCursor() - delta)
                  }}
                  onPanEnd={(endV) => {
                    store.startMomentum(-endV)
                  }}
                  onZoomFactor={(factor) => store.zoomByFactor(factor)}
                  showHoverTooltip={true}
                />
                <PlotToolsOverlay
                  ref={toolsRef}
                  frozen={store.getFrozen()}
                  hasData={snap.viewPortSize > 0}
                  onToggleFrozen={() => {
                    store.stopMomentum()
                    if (!store.getFrozen()) {
                      store.setFrozen(true)
                    } else {
                      store.setViewPortCursor(0)
                      store.setFrozen(false)
                    }
                  }}
                  onZoomIn={() => store.zoomByFactor(1.25)}
                  onZoomOut={() => store.zoomByFactor(0.8)}
                  onExportCsv={handleExportCsv}
                  onSavePng={async () => {
                    const node = plotContainerRef.current
                    if (!node) return
                    const bg = getComputedStyle(document.documentElement).getPropertyValue('--plot-bg') || '#fff'
                    const dataUrl = await captureElementPng(node, { pixelRatio: 2, backgroundColor: bg.trim() || '#fff', paddingPx: 12, temporarilyHide: toolsRef.current ? [toolsRef.current] : [] })
                    downloadDataUrlPng(dataUrl, `plot-${Date.now()}.png`)
                  }}
                />
                {/* Legend overlay bottom-right if data present */}
                {snap.viewPortSize > 0 && (
                  <div className="absolute bottom-8 right-2 pointer-events-auto">
                    <Legend />
                  </div>
                )}
                {snap.viewPortSize === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs opacity-50">
                    Connect a device or start test to begin plotting…
                  </div>
                )}
              </div>
              <div
                className="cursor-row-resize bg-neutral-800 hover:bg-neutral-700 select-none touch-none"
                onPointerDown={startDragResize}
              />
              <div className="overflow-auto">
                {snap.viewPortSize === 0 ? null : <StatsPanel snapshot={snap} />}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              <SerialConsole 
                isConnected={dataConnection.state.isConnected}
                onSendMessage={dataConnection.write}
              />
            </div>
          )}
        </div>
        {/* Removed old bottom screenshot button; use overlay or per-card actions */}
        {lastLine && (
          <div className="text-xs text-neutral-400 truncate">Last line: {lastLine}</div>
        )}
      </main>
      
      <Footer 
        githubUrl="https://github.com/atomic14/web-serial-plotter"
        patreonUrl="https://www.patreon.com/atomic14"
      />
      </div>
  )
}

export default App
